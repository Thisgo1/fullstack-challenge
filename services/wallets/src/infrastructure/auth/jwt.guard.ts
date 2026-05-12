import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger
} from '@nestjs/common';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

// POR QUE BUSCAR A CHAVE NO JWKS E NÃO HARDCODAR?
// O Keycloak rotaciona suas chaves periodicamente.
// O endpoint JWKS sempre retorna as chaves atuais — zero configuração manual.
// Se a chave mudar, o sistema continua funcionando automaticamente.

const REALM = process.env.KEYCLOAK_REALM ?? 'crash-game';

const jwksClient = new JwksClient({
  jwksUri: `http://keycloak:8080/realms/${REALM}/protocol/openid-connect/certs`,
  cache: true,           // cacheia as chaves por 10min — evita hit no Keycloak a cada request
  cacheMaxAge: 600_000,
});

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token não fornecido');
    }

    const token = authHeader.slice(7);

    try {
      // Decodifica sem verificar para pegar o kid (key id)
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Token inválido');
      }

      // Busca a chave pública correspondente ao kid no JWKS
      const key = await jwksClient.getSigningKey(decoded.header.kid);
      const publicKey = key.getPublicKey();

      // Verifica assinatura, expiração e issuer
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: [
          `http://localhost:8080/realms/${REALM}`,
          `http://keycloak:8080/realms/${REALM}`,
        ],
      }) as jwt.JwtPayload;

      // POR QUE INJETAR NO request.user?
      // É a convenção do NestJS — qualquer controller pode acessar
      // req.user para pegar os dados do usuário autenticado.
      request.user = {
        sub:      payload.sub,           // ID único do usuário
        username: payload.preferred_username,
        email:    payload.email,
      };

      return true;
    } catch (err: any) {
      this.logger.warn(`JWT validation failed: ${err.message}`);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
