import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { TaskRealtimeGateway } from './task-realtime.gateway';
import { TaskStatus } from '@prisma/client';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetTasksDto } from './dto/get-tasks.dto';

import {
    NotFoundException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';

type TaskStatusHistoryEntry = {
    id: string;
    taskId: string;
    changedById: string;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
    createdAt: Date;
    changedBy?: {
        id: string;
        nickName: string;
        email: string;
    };
};

type TaskStatusHistoryClient = {
    create: (args: {
        data: {
            taskId: string;
            changedById: string;
            oldStatus: TaskStatus;
            newStatus: TaskStatus;
        };
        include: {
            changedBy: {
                select: {
                    id: true;
                    nickName: true;
                    email: true;
                };
            };
        };
    }) => Promise<TaskStatusHistoryEntry>;
    findMany: (args: {
        where: {
            taskId: string;
        };
        orderBy: {
            createdAt: 'desc';
        };
        include: {
            changedBy: {
                select: {
                    id: true;
                    nickName: true;
                    email: true;
                };
            };
        };
    }) => Promise<TaskStatusHistoryEntry[]>;
};

type PrismaWithTaskHistory = PrismaService & {
    taskStatusHistory: TaskStatusHistoryClient;
};

@Injectable()
export class TasksService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly realtimeGateway: TaskRealtimeGateway,
    ) {}

    async list(
        workspaceId: string,
        projectId: string,
        currentUserId: string,
        query: GetTasksDto,
    ) {
        const currentMember = await this.prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: currentUserId,
                    projectId,
                },
            },
        });

        if (!currentMember) {
            throw new NotFoundException('Project not found');
        }

        const {
            cursor,
            limit = 20,
            status,
            priority,
            assigneeId,
        } = query ?? {};

        const take = Math.min(Math.max(limit, 1), 50) + 1;

        const tasks = await this.prisma.task.findMany({
            where: {
                projectId,

                project: {
                    workspaceId,
                },

                ...(status && {
                    status,
                }),

                ...(priority && {
                    priority,
                }),

                ...(assigneeId && {
                    assigneeId,
                }),
            },

            orderBy: [
                {
                    createdAt: 'desc',
                },
                {
                    id: 'desc',
                },
            ],

            take,

            ...(cursor && {
                cursor: {
                    id: cursor,
                },
                skip: 1,
            }),
        });

        const hasMore = tasks.length > limit;

        const items = hasMore ? tasks.slice(0, limit) : tasks;

        return {
            items,
            nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
            hasMore,
        };
    }

    async create(
        workspaceId: string,
        projectId: string,
        currentUserId: string,
        dto: CreateTaskDto,
    ) {
        const task = await this.prisma.$transaction(async (tx) => {
            const currentMember = await tx.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: currentUserId,
                        projectId,
                    },
                },
            });

            if (!currentMember) {
                throw new ForbiddenException(
                    'You are not a member of this project',
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

            const workspaceMember = await tx.workspaceMember.findUnique({
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

            const projectMember = await tx.projectMember.findUnique({
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
        });

        this.realtimeGateway.emitTaskCreated(projectId, task);

        return task;
    }

    async update(
        workspaceId: string,
        projectId: string,
        taskId: string,
        currentUserId: string,
        dto: UpdateTaskDto,
    ) {
        let statusHistory: unknown = null;

        const task = await this.prisma.$transaction(async (tx) => {
            const currentMember = await tx.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: currentUserId,
                        projectId,
                    },
                },
            });

            if (!currentMember) {
                throw new ForbiddenException(
                    'You are not a member of this project',
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

            const task = await tx.task.findFirst({
                where: {
                    id: taskId,
                    projectId,
                },
            });

            if (!task) {
                throw new NotFoundException('Task not found');
            }

            const oldStatus = task.status;

            if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
                const workspaceMember = await tx.workspaceMember.findUnique({
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

                const projectMember = await tx.projectMember.findUnique({
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
            }

            const updatedTask = await tx.task.update({
                where: {
                    id: taskId,
                },
                data: {
                    ...(dto.title !== undefined && {
                        title: dto.title,
                    }),

                    ...(dto.description !== undefined && {
                        description: dto.description,
                    }),

                    ...(dto.status !== undefined && {
                        status: dto.status,
                    }),

                    ...(dto.priority !== undefined && {
                        priority: dto.priority,
                    }),

                    ...(dto.dueDate !== undefined && {
                        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                    }),

                    ...(dto.assigneeId !== undefined && {
                        assigneeId: dto.assigneeId,
                    }),
                },
            });

            if (dto.status !== undefined && dto.status !== oldStatus) {
                statusHistory = await (
                    tx as PrismaWithTaskHistory
                ).taskStatusHistory.create({
                    data: {
                        taskId,
                        changedById: currentUserId,
                        oldStatus,
                        newStatus: dto.status,
                    },
                    include: {
                        changedBy: {
                            select: {
                                id: true,
                                nickName: true,
                                email: true,
                            },
                        },
                    },
                });
            }

            return updatedTask;
        });
        this.realtimeGateway.emitTaskChanged(projectId, task);

        if (statusHistory) {
            this.realtimeGateway.emitHistoryCreated(projectId, statusHistory);
        }
        return task;
    }

    async getHistory(
        workspaceId: string,
        projectId: string,
        taskId: string,
        currentUserId: string,
    ) {
        const currentMember = await this.prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: currentUserId,
                    projectId,
                },
            },
        });

        if (!currentMember) {
            throw new NotFoundException('Project not found');
        }

        const task = await this.prisma.task.findFirst({
            where: {
                id: taskId,
                projectId,
                project: {
                    workspaceId,
                },
            },
        });

        if (!task) {
            throw new NotFoundException('Task not found');
        }

        return (
            this.prisma as PrismaWithTaskHistory
        ).taskStatusHistory.findMany({
            where: {
                taskId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                changedBy: {
                    select: {
                        id: true,
                        nickName: true,
                        email: true,
                    },
                },
            },
        });
    }

    async delete(
        workspaceId: string,
        projectId: string,
        taskId: string,
        currentUserId: string,
    ) {
        const deletedTask = await this.prisma.$transaction(async (tx) => {
            const currentMember = await tx.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: currentUserId,
                        projectId,
                    },
                },
            });

            if (!currentMember) {
                throw new ForbiddenException(
                    'You are not a member of this project',
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

            const task = await tx.task.findFirst({
                where: {
                    id: taskId,
                    projectId,
                },
            });

            if (!task) {
                throw new NotFoundException('Task not found');
            }

            return tx.task.delete({
                where: {
                    id: taskId,
                },
            });
        });

        this.realtimeGateway.emitTaskDeleted(projectId, taskId);

        return deletedTask;
    }
}
