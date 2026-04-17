import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from './entities/program.entity';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { User } from '../auth/entities/user.entity';
import { Issue } from '../issues/entities/issue.entity';
import { Task } from '../tasks/entities/task.entity';
import { Survey } from '../surveys/entities/survey.entity';
import { AnnouncementsModule } from '../announcements/announcements.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Program, OrgUnit, User, Issue, Task, Survey]),
    AnnouncementsModule,
  ],
  controllers: [ProgramsController],
  providers: [ProgramsService],
  exports: [ProgramsService],
})
export class ProgramsModule {}
