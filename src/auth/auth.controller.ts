import {
    Body,
    Controller,
    Post,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

type AuthRequest = Request & {
    cookies: {
        refresh_token?: string;
    };
};

const REFRESH_TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    @Throttle({
        default: {
            ttl: 60_000,
            limit: 5,
        },
    })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const { accessToken, refreshToken } = await this.authService.login(dto);

        response.cookie('refresh_token', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        return {
            accessToken,
        };
    }

    @Post('refresh')
    async refresh(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refreshToken = request.cookies.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const { accessToken, refreshToken: newRefreshToken } =
            await this.authService.refresh(refreshToken);

        response.cookie('refresh_token', newRefreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);

        return {
            accessToken,
        };
    }

    @Post('logout')
    async logout(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refreshToken = request.cookies.refresh_token;

        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }

        response.clearCookie('refresh_token');

        return {
            message: 'Logged out successfully',
        };
    }
}