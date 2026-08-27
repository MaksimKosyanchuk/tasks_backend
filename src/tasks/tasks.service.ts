import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import { CreateTaskDto } from './dto/create-task.dto';

import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TasksService {

    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async create(
        workspaceId: string,
        projectId: string,
        currentUserId: string,
        dto: CreateTaskDto,
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
                'Only project owner can manage tasks',
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

        const assignee = await tx.user.findUnique({
            where: {
                id: dto.assigneeId,
            },
        });

        if (!assignee) {
            throw new NotFoundException('Assignee not found');
        }

        const workspaceMember =
            await tx.workspaceMember.findUnique({
                where: {
                    userId_workspaceId: {
                        userId: dto.assigneeId,
                        workspaceId,
                    },
                },
            });

        if (!workspaceMember) {
            throw new ConflictException(
                'Assignee is not a member of this workspace',
            );
        }

        const projectMember =
            await tx.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: dto.assigneeId,
                        projectId,
                    },
                },
            });

        if (!projectMember) {
            throw new ConflictException(
                'Assignee is not a member of this project',
            );
        }

        return tx.task.create({
            data: {
                title: dto.title,
                description: dto.description,
                priority: dto.priority,
                dueDate: new Date(dto.dueDate),
                assigneeId: dto.assigneeId,
                projectId,
            },
        });
        })
    }
}
