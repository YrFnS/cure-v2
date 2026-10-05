import 'dotenv/config';
import {
  ArgumentsHost,
  CallHandler,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  HttpException,
  Logger,
  Module,
  NestInterceptor,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express, { json } from 'express';
import path from 'node:path';
import { map } from 'rxjs';
import { AiService } from './ai/ai.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './common/auth';
import { PrismaService } from './common/prisma.service';
import { WhatsAppService } from './common/whatsapp.service';
import { DirectoryController } from './directory.controller';
import { LabController } from './lab.controller';
import { NotificationsController } from './notifications.controller';
import { ReportsController } from './reports.controller';
import { VerificationController } from './verification.controller';

// Same envelope the app already unwraps: { success, data } / { success: false, message }.
class Envelope implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(data => ({ success: true, data })));
  }
}

@Catch()
class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (exception instanceof HttpException) {
      const body: any = exception.getResponse();
      return response
        .status(exception.getStatus())
        .json({ success: false, statusCode: exception.getStatus(), message: body?.message ?? body });
    }
    // Unexpected errors: log the detail, return nothing internal.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    response.status(500).json({ success: false, statusCode: 500, message: 'Internal server error' });
  }
}

@Module({
  controllers: [
    AuthController,
    VerificationController,
    LabController,
    ReportsController,
    NotificationsController,
    DirectoryController,
  ],
  providers: [PrismaService, WhatsAppService, AiService, AuthGuard],
})
class AppModule {}

async function bootstrap() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Copy .env.example to .env.');

  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '20mb' })); // ID photos and result PDFs arrive as base64
  app.use('/lab', express.static(path.resolve('public/lab')));
  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(new Envelope());
  app.useGlobalFilters(new ErrorFilter());
  app.enableCors(); // the Expo web build and the lab portal call the API from a browser
  app.enableShutdownHooks();

  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
