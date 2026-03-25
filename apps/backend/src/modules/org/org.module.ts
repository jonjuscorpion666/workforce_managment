import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgUnit } from './entities/org-unit.entity';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrgUnit])],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService, TypeOrmModule],
})
export class OrgModule {}
