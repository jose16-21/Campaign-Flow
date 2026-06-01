import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:4200',
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Swagger — solo disponible en desarrollo
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Campaign Flow Builder — API')
      .setDescription(
        'API REST para automatización de campañas con segmentación dinámica.\n\n' +
        '**Motor de filtros**: árbol AND/OR recursivo con SQL parametrizado.\n\n' +
        '**Formato de errores**: `{ error: { code, message } }`\n\n' +
        '**Paginación**: `{ data, page, pageSize, total }`',
      )
      .setVersion('1.2.0')
      .addTag('Contactos', 'Gestión de contactos con atributos dinámicos')
      .addTag('Campañas', 'Campañas con canvas visual de flujos')
      .addTag('Canvas', 'Guardado atómico del canvas de nodos y conexiones')
      .addTag('Segmentos', 'Resolución de audiencias con filtros dinámicos')
      .build();

    const documento = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, documento, {
      swaggerOptions: {
        persistAuthorization: true,
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
      },
    });
  }

  // Endpoint de salud para healthcheck de App Runner / Docker
  app.getHttpAdapter().get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  await app.listen(process.env['PORT'] ?? 3000);
}

bootstrap();
