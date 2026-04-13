import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Config } from './entities/config.entity';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Config)   private readonly configRepo: Repository<Config>,
    @InjectRepository(Role)     private readonly roleRepo:   Repository<Role>,
    @InjectRepository(User)     private readonly userRepo:   Repository<User>,
    @InjectRepository(OrgUnit)  private readonly orgRepo:    Repository<OrgUnit>,
  ) {}

  async setConfig(data: { key: string; value: any; description?: string }, updatedById: string) {
    const existing = await this.configRepo.findOne({ where: { key: data.key } });
    if (existing) {
      return this.configRepo.save({ ...existing, value: data.value, updatedById });
    }
    return this.configRepo.save(this.configRepo.create({ ...data, updatedById }));
  }

  getAllConfig() { return this.configRepo.find(); }
  getConfig(key: string) { return this.configRepo.findOne({ where: { key } }); }
  getRoles() { return this.roleRepo.find({ relations: ['permissions'] }); }
  createRole(data: any) { return this.roleRepo.save(this.roleRepo.create(data)); }

  async getUsersPaginated(opts: {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page  = Math.max(1, opts.page);
    const limit = Math.min(100, Math.max(1, opts.limit));
    const skip  = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('u')
      .select([
        'u.id', 'u.email', 'u.firstName', 'u.lastName',
        'u.status', 'u.jobTitle', 'u.employeeId', 'u.createdAt',
        'role.id', 'role.name',
        'ou.id', 'ou.name', 'ou.level', 'ou.parentId',
        'parent.id', 'parent.name', 'parent.level', 'parent.parentId',
        'grandparent.id', 'grandparent.name', 'grandparent.level',
        'mgr.id', 'mgr.firstName', 'mgr.lastName',
      ])
      .leftJoin('u.roles', 'role')
      .leftJoin('u.orgUnit', 'ou')
      .leftJoin('ou.parent', 'parent')
      .leftJoin('parent.parent', 'grandparent')
      .leftJoin('u.reportsTo', 'mgr')
      .orderBy('u.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (opts.search?.trim()) {
      const q = `%${opts.search.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(u.firstName) LIKE :q OR LOWER(u.lastName) LIKE :q OR LOWER(u.email) LIKE :q OR LOWER(COALESCE(u.employeeId, '')) LIKE :q)",
        { q },
      );
    }
    if (opts.role)   qb.andWhere('role.name = :role',   { role: opts.role });
    if (opts.status) qb.andWhere('u.status = :status',  { status: opts.status });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async searchManagers(q: string, roles: string[]): Promise<any[]> {
    const qb = this.userRepo.createQueryBuilder('u')
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'role.id', 'role.name', 'ou.id', 'ou.name'])
      .leftJoin('u.roles', 'role')
      .leftJoin('u.orgUnit', 'ou')
      .orderBy('u.firstName', 'ASC')
      .limit(20);

    if (roles.length) qb.andWhere('role.name IN (:...roles)', { roles });
    if (q?.trim()) {
      const like = `%${q.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(u.firstName) LIKE :like OR LOWER(u.lastName) LIKE :like OR LOWER(u.email) LIKE :like)',
        { like },
      );
    }
    return qb.getMany();
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roleName: string;
    orgUnitId?: string;
    reportsToId?: string;
    jobTitle?: string;
    employeeId?: string;
  }) {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');

    const role = await this.roleRepo.findOne({ where: { name: data.roleName } });
    if (!role) throw new NotFoundException(`Role "${data.roleName}" not found`);

    const orgUnit = data.orgUnitId
      ? await this.orgRepo.findOne({ where: { id: data.orgUnitId } })
      : null;

    const manager = data.reportsToId
      ? await this.userRepo.findOne({ where: { id: data.reportsToId } })
      : null;

    const hashed = await bcrypt.hash(data.password, 12);
    const user = this.userRepo.create({
      firstName:  data.firstName,
      lastName:   data.lastName,
      email:      data.email,
      password:   hashed,
      jobTitle:   data.jobTitle ?? null,
      employeeId: data.employeeId ?? null,
      roles:      [role],
      orgUnit:    orgUnit ?? undefined,
      reportsTo:  manager ?? undefined,
    });

    const saved = await this.userRepo.save(user);
    const { password, ...result } = saved as any;
    return result;
  }

  async updateUser(id: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    roleName?: string;
    orgUnitId?: string | null;
    reportsToId?: string | null;
    jobTitle?: string;
    employeeId?: string;
    status?: string;
  }) {
    const user = await this.userRepo.findOne({ where: { id }, relations: ['roles', 'orgUnit', 'reportsTo'] });
    if (!user) throw new NotFoundException('User not found');

    if (data.firstName)  user.firstName  = data.firstName;
    if (data.lastName)   user.lastName   = data.lastName;
    if (data.jobTitle !== undefined) user.jobTitle = data.jobTitle;
    if (data.employeeId !== undefined) user.employeeId = data.employeeId;
    if (data.status)     (user as any).status = data.status;

    if (data.roleName) {
      const role = await this.roleRepo.findOne({ where: { name: data.roleName } });
      if (!role) throw new NotFoundException(`Role "${data.roleName}" not found`);
      user.roles = [role];
    }

    if (data.orgUnitId !== undefined) {
      user.orgUnit = data.orgUnitId
        ? (await this.orgRepo.findOne({ where: { id: data.orgUnitId } })) ?? undefined
        : undefined;
    }

    if (data.reportsToId !== undefined) {
      user.reportsTo = data.reportsToId
        ? (await this.userRepo.findOne({ where: { id: data.reportsToId } })) ?? undefined
        : undefined;
    }

    const saved = await this.userRepo.save(user);
    const { password, ...result } = saved as any;
    return result;
  }

  async bulkCreateUsers(rows: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roleName: string;
    orgUnitName?: string;
    managerEmail?: string;
    jobTitle?: string;
    employeeId?: string;
  }[]) {
    // Pre-load all roles, org units, and existing users once for efficiency
    const allRoles    = await this.roleRepo.find();
    const allOrgUnits = await this.orgRepo.find();
    const allUsers    = await this.userRepo.find({ select: ['id', 'email'] as any });

    const roleMap    = new Map(allRoles.map((r) => [r.name.toUpperCase(), r]));
    const orgMap     = new Map(allOrgUnits.map((u) => [u.name.toLowerCase().trim(), u]));
    // userMap includes both pre-existing users AND users created during this batch
    const userMap    = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));

    const created: any[] = [];
    const failed:  { row: number; email: string; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      try {
        if (!row.firstName?.trim() || !row.lastName?.trim()) {
          failed.push({ row: rowNum, email: row.email ?? '', reason: 'Missing first or last name' });
          continue;
        }
        if (!row.email?.trim()) {
          failed.push({ row: rowNum, email: '', reason: 'Missing email' });
          continue;
        }
        if (!row.password?.trim()) {
          failed.push({ row: rowNum, email: row.email, reason: 'Missing password' });
          continue;
        }

        const emailKey = row.email.trim().toLowerCase();
        if (userMap.has(emailKey)) {
          failed.push({ row: rowNum, email: row.email, reason: 'Email already registered' });
          continue;
        }

        const role = roleMap.get(row.roleName?.trim().toUpperCase());
        if (!role) {
          failed.push({ row: rowNum, email: row.email, reason: `Role "${row.roleName}" not found` });
          continue;
        }

        const orgUnit = row.orgUnitName
          ? (orgMap.get(row.orgUnitName.toLowerCase().trim()) ?? null)
          : null;

        // Resolve manager by email — supports both pre-existing users and
        // managers created earlier in the same batch
        let manager: User | null = null;
        if (row.managerEmail?.trim()) {
          const mgrKey = row.managerEmail.trim().toLowerCase();
          const mgrRef = userMap.get(mgrKey);
          if (mgrRef) {
            manager = await this.userRepo.findOne({ where: { id: mgrRef.id } });
          }
          // If manager not found, still create the user — just leave reportsTo null
        }

        const hashed = await bcrypt.hash(row.password.trim(), 12);
        const user = this.userRepo.create({
          firstName:  row.firstName.trim(),
          lastName:   row.lastName.trim(),
          email:      emailKey,
          password:   hashed,
          jobTitle:   row.jobTitle?.trim()   || null,
          employeeId: row.employeeId?.trim() || null,
          roles:      [role],
          orgUnit:    orgUnit ?? undefined,
          reportsTo:  manager ?? undefined,
        });

        const saved = await this.userRepo.save(user);
        // Register new user in the map so later rows can reference them as manager
        userMap.set(emailKey, { id: saved.id, email: saved.email } as any);

        const { password: _pw, ...result } = saved as any;
        created.push(result);
      } catch (err: any) {
        failed.push({ row: rowNum, email: row.email ?? '', reason: err.message ?? 'Unknown error' });
      }
    }

    return { created: created.length, failed };
  }
}
