import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['roles', 'orgUnit'],
    });
    // Use the same generic message for both "user not found" and "wrong password"
    // to prevent email enumeration.
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if ((user as any).status && (user as any).status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);
    return this.generateTokens(user);
  }

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, password: hashed });
    await this.userRepo.save(user);
    const { password, ...result } = user;
    return result;
  }

  async refreshToken(token: string) {
    if (!token) throw new UnauthorizedException('Refresh token required');
    const refreshSecret = process.env.REFRESH_TOKEN_SECRET;
    if (!refreshSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('REFRESH_TOKEN_SECRET environment variable must be set in production');
      }
      // Dev fallback — same warning pattern as JWT_SECRET
      console.warn('⚠  REFRESH_TOKEN_SECRET not set — using access token secret as fallback.');
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: refreshSecret,
      });
      const user = await this.userRepo.findOne({
        where: { id: payload.sub },
        relations: ['roles', 'orgUnit'],
      });
      if (!user) throw new UnauthorizedException('User not found');
      // Reject refresh for suspended / inactive accounts
      if ((user as any).status && (user as any).status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is not active');
      }
      return this.generateTokens(user);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // Invalidate refresh token — implement with Redis blocklist if needed
    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles', 'orgUnit', 'orgUnit.parent', 'orgUnit.parent.parent', 'reportsTo'],
    });
    if (!user) throw new UnauthorizedException();

    // Walk up the org tree to find hospital and department
    let hospital: { id: string; name: string } | null = null;
    let department: { id: string; name: string } | null = null;
    let node = user.orgUnit as any;
    while (node) {
      if (node.level === 'HOSPITAL') hospital = { id: node.id, name: node.name };
      if (node.level === 'DEPARTMENT') department = { id: node.id, name: node.name };
      node = node.parent ?? null;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: (user as any).jobTitle ?? null,
      employeeId: (user as any).employeeId ?? null,
      orgUnit: user.orgUnit ? { id: user.orgUnit.id, name: user.orgUnit.name, level: (user.orgUnit as any).level } : null,
      department,
      hospital,
      manager: user.reportsTo
        ? { id: user.reportsTo.id, firstName: user.reportsTo.firstName, lastName: user.reportsTo.lastName, jobTitle: (user.reportsTo as any).jobTitle ?? null }
        : null,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (user && (await bcrypt.compare(password, user.password))) return user;
    return null;
  }

  private generateTokens(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.roles?.map((r) => r.name) || [],
    };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: process.env.REFRESH_TOKEN_SECRET,
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d',
      }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        orgUnit: user.orgUnit ?? null,
      },
    };
  }
}
