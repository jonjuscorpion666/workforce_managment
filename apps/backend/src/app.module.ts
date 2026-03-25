import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { AuthModule } from './modules/auth/auth.module';
import { SurveysModule } from './modules/surveys/surveys.module';
import { ResponsesModule } from './modules/responses/responses.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IssuesModule } from './modules/issues/issues.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { EscalationsModule } from './modules/escalations/escalations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { SpeakUpModule } from './modules/speakup/speakup.module';
import { KpisModule } from './modules/kpis/kpis.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/admin/admin.module';
import { OrgModule } from './modules/org/org.module';
import { ProgramFlowModule } from './modules/program-flow/program-flow.module';

@Module({
  imports: [
    // Config — look for .env at monorepo root, fallback to local
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') === 'development',
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),

    // Queue
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),

    // Scheduler (cron jobs)
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    SurveysModule,
    ResponsesModule,
    AnalyticsModule,
    IssuesModule,
    TasksModule,
    EscalationsModule,
    DashboardModule,
    MeetingsModule,
    AnnouncementsModule,
    SpeakUpModule,
    KpisModule,
    AuditModule,
    AdminModule,
    OrgModule,
    ProgramFlowModule,
  ],
})
export class AppModule {}
