FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .
RUN bun run build

# POR QUE NGINX E NÃO SERVIR COM BUN?
# O nginx é otimizado para servir arquivos estáticos — compressão gzip,
# cache headers, e proxy reverso sem overhead de runtime JS.
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
