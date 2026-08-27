import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthJwtService {
    constructor(
        private readonly jwt: JwtService,
        private readonly config: ConfigService,
    ) {}


    //FIX: SET ACCESS TOKEN TIME TO 15m
    signAccessToken(payload: object) {
        return this.jwt.sign(payload, {
            secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
            expiresIn: '15d',
        });
    }

    signRefreshToken(payload: object) {
        return this.jwt.sign(payload, {
            secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
            expiresIn: '7d',
        });
    }

    verifyAccessToken<T extends object>(token: string): T {
        return this.jwt.verify<T>(token, {
            secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        });
    }

    verifyRefreshToken<T extends object>(token: string): T {
        return this.jwt.verify<T>(token, {
            secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        });
    }
}