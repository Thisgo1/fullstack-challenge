FROM oven/bun:1-alpine
WORKDIR /app

RUN apk add --no-cache curl 

COPY package.json bun.lock ./
RUN bun install

COPY . .

RUN bunx prisma generate

EXPOSE 4002

CMD ["sh", "-c", "bunx prisma migrate deploy && bun run src/main.ts"]
