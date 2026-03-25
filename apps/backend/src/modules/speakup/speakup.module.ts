import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpeakUpCase } from './entities/speak-up-case.entity';
import { SpeakUpActivity } from './entities/speak-up-activity.entity';
import { SpeakUpController } from './speakup.controller';
import { SpeakUpService } from './speakup.service';
import { Issue } from '../issues/entities/issue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpeakUpCase, SpeakUpActivity, Issue])],
  controllers: [SpeakUpController],
  providers: [SpeakUpService],
  exports: [SpeakUpService],
})
export class SpeakUpModule {}
