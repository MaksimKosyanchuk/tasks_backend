import { Injectable, NotFoundException } from '@nestjs/common';

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { ProjectRole } from '@prisma/client';

@Injectable()
export class ProjectsService {
    constructor(private readonly prisma: PrismaService) {}

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
                throw new NotFoundException('Workspace not found');
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

            return tx.project.findUnique({
                where: {
                    id: project.id,
                },
                include: {
                    members: true,
                },
            });
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

            const existingProjectMember = await tx.projectMember.findUnique({
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

    async updateMemberRole(
        workspaceId: string,
        projectId: string,
        currentUserId: string,
        targetUserId: string,
        role: ProjectRole,
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
                    'Only project owner can change roles',
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

            const targetMember = await tx.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: targetUserId,
                        projectId,
                    },
                },
            });

            if (!targetMember) {
                throw new NotFoundException('Project member not found');
            }

            if (targetMember.role === 'OWNER' && role === 'MEMBER') {
                const ownersCount = await tx.projectMember.count({
                    where: {
                        projectId,
                        role: 'OWNER',
                    },
                });

                if (ownersCount <= 1) {
                    throw new ConflictException(
                        'Project must have at least one owner',
                    );
                }
            }

            return tx.projectMember.update({
                where: {
                    id: targetMember.id,
                },
                data: {
                    role,
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

    async removeMember(
        workspaceId: string,
        projectId: string,
        currentUserId: string,
        targetUserId: string,
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
                    'Only project owner can remove members',
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

            const targetMember = await tx.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: targetUserId,
                        projectId,
                    },
                },
            });

            if (!targetMember) {
                throw new NotFoundException('Project member not found');
            }

            if (targetMember.role === 'OWNER') {
                const ownersCount = await tx.projectMember.count({
                    where: {
                        projectId,
                        role: 'OWNER',
                    },
                });

                if (ownersCount <= 1) {
                    throw new ConflictException(
                        'Project must have at least one owner',
                    );
                }
            }

            return tx.projectMember.delete({
                where: {
                    id: targetMember.id,
                },
            });
        });
    }

    async getById(workspaceId: string, projectId: string, userId: string) {
        const member = await this.prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });

        if (!member) {
            throw new NotFoundException('Project not found');
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
            },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
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
                tasks: true,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return project;
    }

    async update(
        workspaceId: string,
        projectId: string,
        userId: string,
        name?: string,
        description?: string | null,
    ) {
        const currentMember = await this.prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });

        if (!currentMember || currentMember.role !== 'OWNER') {
            throw new ForbiddenException(
                'Only project owner can manage project',
            );
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return this.prisma.project.update({
            where: {
                id: projectId,
            },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
            },
        });
    }

    async delete(workspaceId: string, projectId: string, userId: string) {
        const currentMember = await this.prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId,
                    projectId,
                },
            },
        });

        if (!currentMember || currentMember.role !== 'OWNER') {
            throw new ForbiddenException(
                'Only project owner can manage project',
            );
        }

        const project = await this.prisma.project.findFirst({
            where: {
                id: projectId,
                workspaceId,
            },
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        return this.prisma.project.delete({
            where: {
                id: projectId,
            },
        });
    }
}
