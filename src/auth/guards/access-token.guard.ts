import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthJwtService } from '../jwt/jwt.service';

interface AccessTokenPayload {
    sub: string;
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(
        private readonly authJwtService: AuthJwtService,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        const authorization = request.headers.authorization;    

        if (!authorization) {
            throw new UnauthorizedException('Access token not provided');
        }

        const [type, token] = authorization.split(' ');

        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException('Invalid authorization header');
        }

        try {
            const payload =
                this.authJwtService.verifyAccessToken<AccessTokenPayload>(
                    token,
                );

            request.user = {
                id: payload.sub,
            };

            return true;
        } catch {
            throw new UnauthorizedException('Invalid access token');
        }
    }
}