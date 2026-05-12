import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger
} from '@nestjs/common';
import { JwksClient } from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';

const REALM = process.env.KEYCLOAK_REALM ?? 'crash-game';

const jwksClient = new JwksClient({
  jwksUri: `http://keycloak:8080/realms/${REALM}/protocol/openid-connect/certs`,
  cache: true,
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
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Token inválido');
      }


      const key = await jwksClient.getSigningKey(decoded.header.kid);
      const publicKey = key.getPublicKey();


      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: [
          `http://localhost:8080/realms/${REALM}`,
          `http://keycloak:8080/realms/${REALM}`,
        ],
      }) as jwt.JwtPayload;

      request.user = {
        sub:      payload.sub,           
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
