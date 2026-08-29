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
import {
    ApiBody,
    ApiCookieAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    @ApiOperation({
        summary: 'Register a new user',
    })
    @ApiBody({
        type: RegisterDto,
    })
    @ApiResponse({
        status: 201,
        description: 'User successfully registered.',
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error.',
    })
    @ApiResponse({
        status: 409,
        description: 'User with this email or nickname already exists.',
    })
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
    @ApiOperation({
        summary: 'Login user',
        description:
            'Authenticates a user and returns an access token. A refresh token is stored in an HttpOnly cookie.',
    })
    @ApiBody({
        type: LoginDto,
    })
    @ApiResponse({
        status: 201,
        description: 'User successfully logged in. Refresh token is set as an HttpOnly cookie.',
        schema: {
            example: {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error.',
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid email or password.',
    })
    @ApiResponse({
        status: 429,
        description: 'Too many login attempts.',
    })
    async login(
        @Body() dto: LoginDto,
        @Res({ passthrough: true }) response: Response,
    ) {
        const { accessToken, refreshToken } =
            await this.authService.login(dto);

        response.cookie(
            'refresh_token',
            refreshToken,
            REFRESH_TOKEN_COOKIE_OPTIONS,
        );

        return {
            accessToken,
        };
    }

    @Post('refresh')
    @ApiOperation({
        summary: 'Refresh access token',
        description:
            'Generates a new access token and refresh token using the refresh token stored in the HttpOnly cookie.',
    })
    @ApiCookieAuth('refresh_token')
    @ApiResponse({
        status: 201,
        description:
            'Access token refreshed successfully. A new refresh token is set as an HttpOnly cookie.',
        schema: {
            example: {
                accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                user: {
                    id: '693b1053-0190-4130-b850-a9ee728690b1',
                    email: 'user@example.com',
                    nickName: 'maks',
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Refresh token not found or invalid.',
    })
    async refresh(
        @Req() request: AuthRequest,
        @Res({ passthrough: true }) response: Response,
    ) {
        const refreshToken = request.cookies.refresh_token;

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token not found');
        }

        const { accessToken, refreshToken: newRefreshToken, user } =
            await this.authService.refresh(refreshToken);

        response.cookie(
            'refresh_token',
            newRefreshToken,
            REFRESH_TOKEN_COOKIE_OPTIONS,
        );

        return {
            accessToken,
            user,
        };
    }

    @Post('logout')
    @ApiOperation({
        summary: 'Logout user',
        description:
            'Invalidates the refresh token and clears the refresh token cookie.',
    })
    @ApiCookieAuth('refresh_token')
    @ApiResponse({
        status: 201,
        description: 'User successfully logged out.',
        schema: {
            example: {
                message: 'Logged out successfully',
            },
        },
    })
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