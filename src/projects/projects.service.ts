import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';

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
}