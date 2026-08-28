import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }

    async findByNickName(nickName: string) {
        return this.prisma.user.findUnique(
            {
                where: {
                    nickName
                }
            }
        )
    }

    async findById(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async create(email: string, nickName: string, password: string) {
        return this.prisma.user.create({
            data: {
                email,
                nickName,
                password,
            },
        });
    }

    async updateRefreshTokenHash(
        userId: string,
        refreshTokenHash: string,
    ) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                refreshTokenHash,
            },
        });
    }

    async clearRefreshTokenHash(userId: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: {
                refreshTokenHash: null,
            },
        });
    }
}