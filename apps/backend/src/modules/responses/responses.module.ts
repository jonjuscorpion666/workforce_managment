import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Response } from './entities/response.entity';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { SurveysModule } from '../surveys/surveys.module';
import { AuditModule } from '../audit/audit.module';
import { User } from '../auth/entities/user.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { ProgramsModule } from '../programs/programs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Response, User, OrgUnit]), SurveysModule, AuditModule, ProgramsModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService, TypeOrmModule],
})
export class ResponsesModule {}
