import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // Global prefix
  app.setGlobalPrefix('api');

  // API versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Workforce Transformation Platform API')
    .setDescription('Enterprise Workforce Transformation & Employee Engagement Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Surveys')
    .addTag('Responses')
    .addTag('Analytics')
    .addTag('Issues')
    .addTag('Tasks')
    .addTag('Escalations')
    .addTag('Dashboard')
    .addTag('Meetings')
    .addTag('Announcements')
    .addTag('Speak Up')
    .addTag('KPIs')
    .addTag('Audit')
    .addTag('Admin')
    .addTag('Org')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`🚀 Backend running at: http://localhost:${port}/api`);
  console.log(`📚 Swagger docs at:    http://localhost:${port}/api/docs`);
}

bootstrap();
