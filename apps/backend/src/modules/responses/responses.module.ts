import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Response } from './entities/response.entity';
import { ResponsesController } from './responses.controller';
import { ResponsesService } from './responses.service';
import { SurveysModule } from '../surveys/surveys.module';
import { AuditModule } from '../audit/audit.module';
import { User } from '../auth/entities/user.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Response, User, OrgUnit]), SurveysModule, AuditModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService, TypeOrmModule],
})
export class ResponsesModule {}
