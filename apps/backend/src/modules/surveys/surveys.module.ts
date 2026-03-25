import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Survey } from './entities/survey.entity';
import { Question } from './entities/question.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { AuditModule } from '../audit/audit.module';
import { Config } from '../admin/entities/config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Survey, Question, Config]), AuditModule],
  controllers: [SurveysController],
  providers: [SurveysService],
  exports: [SurveysService, TypeOrmModule],
})
export class SurveysModule {}
