import { ConflictException, Injectable } from '@nestjs/common';
import { AuthJwtService } from './jwt/jwt.service';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly authJwtService: AuthJwtService,
    ) {}

    async register(dto: RegisterDto) {
        let existingUser = await this.usersService.findByEmail(dto.email);

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        existingUser = await this.usersService.findByNickName(dto.nickName);

        if (existingUser) {
            throw new ConflictException('Nick name already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.usersService.create(
            dto.email,
            dto.nickName,
            hashedPassword,
        );

        return {
            id: user.id,
            nickName: user.nickName,
            email: user.email,
        };
    }

    async login(dto: LoginDto) {
        const user = await this.usersService.findByEmail(dto.email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const passwordMatches = await bcrypt.compare(
            dto.password,
            user.password,
        );

        if (!passwordMatches) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = this.authJwtService.signAccessToken({
            sub: user.id,
        });

        const refreshToken = this.authJwtService.signRefreshToken({
            sub: user.id,
        });

        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

        await this.usersService.updateRefreshTokenHash(
            user.id,
            refreshTokenHash,
        );

        return {
            accessToken,
            refreshToken,
        };
    }

    async refresh(refreshToken: string) {
        let payload: { sub: string };

        try {
            payload = this.authJwtService.verifyRefreshToken<{ sub: string }>(
                refreshToken,
            );
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const user = await this.usersService.findById(payload.sub);

        if (!user || !user.refreshTokenHash) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const tokenMatches = await bcrypt.compare(
            refreshToken,
            user.refreshTokenHash,
        );

        if (!tokenMatches) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const accessToken = this.authJwtService.signAccessToken({
            sub: user.id,
        });

        const newRefreshToken = this.authJwtService.signRefreshToken({
            sub: user.id,
        });

        const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

        await this.usersService.updateRefreshTokenHash(
            user.id,
            newRefreshTokenHash,
        );

        return {
            accessToken,
            refreshToken: newRefreshToken,
        };
    }

    async logout(refreshToken: string) {
        if (!refreshToken) {
            return;
        }

        try {
            const payload = this.authJwtService.verifyRefreshToken<{
                sub: string;
            }>(refreshToken);

            await this.usersService.clearRefreshTokenHash(payload.sub);
        } catch {
            return;
        }
    }
}
