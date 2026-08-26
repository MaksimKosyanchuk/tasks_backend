import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async create(
        workspaceId: string,
        userId: string,
        name: string,
        description?: string,
    ) {
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
                    'Workspace not found',
                );
            }

            const project = await tx.project.create({
                data: {
                    name,
                    description,
                    workspaceId,
                },
            });

            await tx.projectMember.create({
                data: {
                    projectId: project.id,
                    userId,
                    role: 'OWNER',
                },
            });

            return project;
        });
    }

    async findAll(workspaceId: string, userId: string) {
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

        return this.prisma.project.findMany({
            where: {
                workspaceId,
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

    async addMember(
        workspaceId: string,
        projectId: string,
        currentUserId: string,
        email: string,
    ) {
        return this.prisma.$transaction(async (tx) => {
            const currentMember = await tx.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: currentUserId,
                        projectId,
                    },
                },
            });

            if (!currentMember || currentMember.role !== 'OWNER') {
                throw new ForbiddenException(
                    'Only project owner can add members',
                );
            }

            const project = await tx.project.findFirst({
                where: {
                    id: projectId,
                    workspaceId,
                },
            });

            if (!project) {
                throw new NotFoundException('Project not found');
            }

            const user = await tx.user.findUnique({
                where: {
                    email,
                },
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const workspaceMember = await tx.workspaceMember.findUnique({
                where: {
                    userId_workspaceId: {
                        userId: user.id,
                        workspaceId,
                    },
                },
            });

            if (!workspaceMember) {
                throw new ConflictException(
                    'User is not a member of this workspace',
                );
            }

            const existingProjectMember =
                await tx.projectMember.findUnique({
                    where: {
                        userId_projectId: {
                            userId: user.id,
                            projectId,
                        },
                    },
                });

            if (existingProjectMember) {
                throw new ConflictException(
                    'User is already a member of this project',
                );
            }

            return tx.projectMember.create({
                data: {
                    userId: user.id,
                    projectId,
                    role: 'MEMBER',
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            nickName: true,
                            email: true,
                        },
                    },
                },
            });
        });
    }
}