import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { AuthJwtService } from './jwt/jwt.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
    let service: AuthService;

    const usersService = {
        findByEmail: jest.fn(),
        findByNickName: jest.fn(),
        create: jest.fn(),
        updateRefreshTokenHash: jest.fn(),
        findById: jest.fn(),
        clearRefreshTokenHash: jest.fn(),
    };

    const authJwtService = {
        signAccessToken: jest.fn(),
        signRefreshToken: jest.fn(),
        verifyRefreshToken: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: usersService,
                },
                {
                    provide: AuthJwtService,
                    useValue: authJwtService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    describe('register', () => {
        it('should register a new user', async () => {
            usersService.findByEmail.mockResolvedValue(null);
            usersService.findByNickName.mockResolvedValue(null);

            usersService.create.mockResolvedValue({
                id: 'user-1',
                nickName: 'maks',
                email: 'maks@test.com',
                password: 'hashed-password',
            });

            const result = await service.register({
                email: 'maks@test.com',
                nickName: 'maks',
                password: 'password123',
            });

            expect(result).toEqual({
                id: 'user-1',
                nickName: 'maks',
                email: 'maks@test.com',
            });

            expect(usersService.findByEmail).toHaveBeenCalledWith(
                'maks@test.com',
            );

            expect(usersService.findByNickName).toHaveBeenCalledWith('maks');

            expect(usersService.create).toHaveBeenCalledWith(
                'maks@test.com',
                'maks',
                expect.any(String),
            );
        });

        it('should throw ConflictException if email already exists', async () => {
            usersService.findByEmail.mockResolvedValue({
                id: 'existing-user',
                email: 'maks@test.com',
            });

            await expect(
                service.register({
                    email: 'maks@test.com',
                    nickName: 'maks',
                    password: 'password123',
                }),
            ).rejects.toThrow(ConflictException);

            expect(usersService.findByNickName).not.toHaveBeenCalled();
            expect(usersService.create).not.toHaveBeenCalled();
        });

        it('should throw ConflictException if nickname already exists', async () => {
            usersService.findByEmail.mockResolvedValue(null);

            usersService.findByNickName.mockResolvedValue({
                id: 'existing-user',
                nickName: 'maks',
            });

            await expect(
                service.register({
                    email: 'new@test.com',
                    nickName: 'maks',
                    password: 'password123',
                }),
            ).rejects.toThrow(ConflictException);

            expect(usersService.create).not.toHaveBeenCalled();
        });

        it('should hash password before creating user', async () => {
            usersService.findByEmail.mockResolvedValue(null);
            usersService.findByNickName.mockResolvedValue(null);

            usersService.create.mockResolvedValue({
                id: 'user-1',
                nickName: 'maks',
                email: 'maks@test.com',
            });

            await service.register({
                email: 'maks@test.com',
                nickName: 'maks',
                password: 'password123',
            });

            const createdPassword =
                usersService.create.mock.calls[0][2];

            expect(createdPassword).not.toBe('password123');

            expect(
                await bcrypt.compare('password123', createdPassword),
            ).toBe(true);
        });
    });

    describe('login', () => {
        it('should login user and return tokens', async () => {
            const passwordHash = await bcrypt.hash('password123', 10);

            usersService.findByEmail.mockResolvedValue({
                id: 'user-1',
                email: 'maks@test.com',
                nickName: 'maks',
                password: passwordHash,
            });

            authJwtService.signAccessToken.mockReturnValue('access-token');
            authJwtService.signRefreshToken.mockReturnValue('refresh-token');

            usersService.updateRefreshTokenHash.mockResolvedValue(undefined);

            const result = await service.login({
                email: 'maks@test.com',
                password: 'password123',
            });

            expect(result).toEqual({
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
            });

            expect(authJwtService.signAccessToken).toHaveBeenCalledWith({
                sub: 'user-1',
            });

            expect(authJwtService.signRefreshToken).toHaveBeenCalledWith({
                sub: 'user-1',
            });

            expect(usersService.updateRefreshTokenHash).toHaveBeenCalledWith(
                'user-1',
                expect.any(String),
            );
        });

        it('should throw UnauthorizedException if user does not exist', async () => {
            usersService.findByEmail.mockResolvedValue(null);

            await expect(
                service.login({
                    email: 'unknown@test.com',
                    password: 'password123',
                }),
            ).rejects.toThrow(UnauthorizedException);

            expect(authJwtService.signAccessToken).not.toHaveBeenCalled();
            expect(authJwtService.signRefreshToken).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if password is incorrect', async () => {
            const passwordHash = await bcrypt.hash('correct-password', 10);

            usersService.findByEmail.mockResolvedValue({
                id: 'user-1',
                email: 'maks@test.com',
                password: passwordHash,
            });

            await expect(
                service.login({
                    email: 'maks@test.com',
                    password: 'wrong-password',
                }),
            ).rejects.toThrow(UnauthorizedException);

            expect(authJwtService.signAccessToken).not.toHaveBeenCalled();
            expect(authJwtService.signRefreshToken).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('should return a new access token', async () => {
            authJwtService.verifyRefreshToken.mockReturnValue({
                sub: 'user-1',
            });

            usersService.findById.mockResolvedValue({
                id: 'user-1',
                refreshTokenHash: await bcrypt.hash(
                    'refresh-token',
                    10,
                ),
            });

            authJwtService.signAccessToken.mockReturnValue(
                'new-access-token',
            );

            const result = await service.refresh('refresh-token');

            expect(result).toEqual({
                accessToken: 'new-access-token',
            });

            expect(
                authJwtService.signAccessToken,
            ).toHaveBeenCalledWith({
                sub: 'user-1',
            });
        });

        it('should throw UnauthorizedException if refresh token is invalid', async () => {
            authJwtService.verifyRefreshToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(
                service.refresh('invalid-token'),
            ).rejects.toThrow(UnauthorizedException);

            expect(usersService.findById).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException if user does not exist', async () => {
            authJwtService.verifyRefreshToken.mockReturnValue({
                sub: 'user-1',
            });

            usersService.findById.mockResolvedValue(null);

            await expect(
                service.refresh('refresh-token'),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException if refresh token hash does not match', async () => {
            authJwtService.verifyRefreshToken.mockReturnValue({
                sub: 'user-1',
            });

            usersService.findById.mockResolvedValue({
                id: 'user-1',
                refreshTokenHash: await bcrypt.hash(
                    'another-token',
                    10,
                ),
            });

            await expect(
                service.refresh('refresh-token'),
            ).rejects.toThrow(UnauthorizedException);

            expect(authJwtService.signAccessToken).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('should clear refresh token hash', async () => {
            authJwtService.verifyRefreshToken.mockReturnValue({
                sub: 'user-1',
            });

            usersService.clearRefreshTokenHash.mockResolvedValue(undefined);

            await service.logout('refresh-token');

            expect(
                usersService.clearRefreshTokenHash,
            ).toHaveBeenCalledWith('user-1');
        });

        it('should do nothing if refresh token is invalid', async () => {
            authJwtService.verifyRefreshToken.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await service.logout('invalid-token');

            expect(
                usersService.clearRefreshTokenHash,
            ).not.toHaveBeenCalled();
        });
    });

});
