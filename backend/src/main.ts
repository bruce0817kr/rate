import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { buildCorsOptions } from './config/runtime.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  app.enableCors(buildCorsOptions());

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
