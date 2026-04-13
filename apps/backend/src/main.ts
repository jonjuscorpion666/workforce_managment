import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port     = configService.get<number>('PORT', 3001);
  const isProd   = configService.get('NODE_ENV') === 'production';

  // Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
  app.use(helmet());

  // Global prefix
  app.setGlobalPrefix('api');

  // API versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // CORS — crash loudly in production if origins are not explicitly configured
  const rawOrigins = process.env.CORS_ORIGINS;
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  if (isProd && !allowedOrigins.length) {
    throw new Error('CORS_ORIGINS environment variable must be set in production');
  }

  app.enableCors({
    origin: allowedOrigins.length ? allowedOrigins : ['http://localhost:3000'],
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

  // Swagger — disabled in production to prevent endpoint enumeration
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('Workforce Transformation Platform API')
      .setDescription('Enterprise Workforce Transformation & Employee Engagement Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth').addTag('Surveys').addTag('Responses').addTag('Analytics')
      .addTag('Issues').addTag('Tasks').addTag('Escalations').addTag('Dashboard')
      .addTag('Meetings').addTag('Announcements').addTag('Speak Up').addTag('KPIs')
      .addTag('Audit').addTag('Admin').addTag('Org').addTag('Program Flow')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log(`📚 Swagger docs at:    http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  console.log(`🚀 Backend running at: http://localhost:${port}/api`);
}

bootstrap();
