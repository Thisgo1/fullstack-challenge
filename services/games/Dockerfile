FROM oven/bun:1-alpine
WORKDIR /app

RUN apk add --no-cache curl 

COPY package.json bun.lock ./
RUN bun install

COPY . .

# Gera o Prisma client para o ambiente de produção
RUN bunx prisma generate

EXPOSE 4001

# POR QUE MIGRATE DEPLOY E NÃO MIGRATE DEV?
# migrate dev é para desenvolvimento — cria arquivos de migration.
# migrate deploy aplica migrations existentes sem interação — ideal para CI/CD e Docker.
# Se o banco já estiver atualizado, não faz nada. É idempotente.
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
