import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Survey } from './entities/survey.entity';
import { Question } from './entities/question.entity';
import { SurveysController } from './surveys.controller';
import { SurveysService } from './surveys.service';
import { AiSurveyService } from './ai-survey.service';
import { AuditModule } from '../audit/audit.module';
import { Config } from '../admin/entities/config.entity';
import { QuestionBankItem } from '../question-bank/entities/question-bank-item.entity';
import { Program } from '../programs/entities/program.entity';
import { Response } from '../responses/entities/response.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Survey, Question, Config, QuestionBankItem, Program, Response, OrgUnit]), AuditModule],
  controllers: [SurveysController],
  providers: [SurveysService, AiSurveyService],
  exports: [SurveysService, TypeOrmModule],
})
export class SurveysModule {}
