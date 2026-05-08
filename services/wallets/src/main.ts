import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Wallets Service API')
    .setDescription('API para o serviço de carteiras do Crash Game')
    .setVersion('1.0')
    .addTag('wallets')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Habilita validação automática dos DTOs via class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // remove campos não declarados no DTO
      forbidNonWhitelisted: true,
      transform: true,       // converte tipos automaticamente
    }),
  );

  app.setGlobalPrefix('wallets'); // todas as rotas ficam em /wallets/...

  await app.listen(4002);
}
bootstrap();
