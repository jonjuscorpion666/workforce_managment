import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Config } from './entities/config.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Role } from '../auth/entities/role.entity';
import { User } from '../auth/entities/user.entity';
import { Permission } from '../auth/entities/permission.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Config, Role, User, Permission, OrgUnit])],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
