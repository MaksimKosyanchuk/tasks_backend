import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException, NotFoundException, ConflictException } from '@nestjs/common';


@Injectable()
export class WorkspacesService {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async create(name: string, userId: string) {
        return this.prisma.workspace.create({
            data: {
                name,
                members: {
                    create: {
                        userId,
                    },
                },
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.workspace.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                nickName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
    }

    async update(workspaceId: string, userId: string, name: string) {
        const member = await this.prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId,
                    workspaceId,
                },
            },
        });

        if (!member) {
            throw new NotFoundException('Workspace not found');
        }

        return this.prisma.workspace.update({
            where: {
                id: workspaceId,
            },
            data: {
                name,
            },
        });
    }

    async addMember(workspaceId: string, currentUserId: string, email: string) {
        const currentMember = await this.prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: currentUserId,
                    workspaceId,
                },
            },
        });

        if (!currentMember) {
            throw new NotFoundException('Workspace not found');
        }

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const existingMember = await this.prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId: user.id,
                    workspaceId,
                },
            },
        });

        if (existingMember) {
            throw new ConflictException(
                'User is already a member of this workspace',
            );
        }

        return this.prisma.workspaceMember.create({
            data: {
                userId: user.id,
                workspaceId,    
            },
        });
    }

    async leave(workspaceId: string, userId: string) {
        return this.prisma.$transaction(async (tx) => {
            const member = await tx.workspaceMember.findUnique({
                where: {
                    userId_workspaceId: {
                        userId,
                        workspaceId,
                    },
                },
            });

            if (!member) {
                throw new NotFoundException(
                    'You are not a member of this workspace',
                );
            }

            const membersCount = await tx.workspaceMember.count({
                where: {
                    workspaceId,
                },
            });

            if (membersCount === 1) {
                const projectsCount = await tx.project.count({
                    where: {
                        workspaceId,
                    },
                });

                if (projectsCount > 0) {
                    throw new ConflictException(
                        'You cannot leave a workspace that contains projects',
                    );
                }

                await tx.workspace.delete({
                    where: {
                        id: workspaceId,
                    },
                });

                return {
                    message: 'You left and the workspace was deleted',
                };
            }

            await tx.workspaceMember.delete({
                where: {
                    id: member.id,
                },
            });

            return {
                message: 'You left the workspace',
            };
        });
    }

    async delete(workspaceId: string, userId: string) {
        const member = await this.prisma.workspaceMember.findUnique({
            where: {
                userId_workspaceId: {
                    userId,
                    workspaceId,
                },
            },
        });

        if (!member) {
            throw new NotFoundException('Workspace not found');
        }

        return this.prisma.workspace.delete({
            where: {
                id: workspaceId,
            },
        });
    }
}