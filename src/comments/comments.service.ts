import {
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';
import { TaskRealtimeGateway } from 'src/tasks/task-realtime.gateway';

@Injectable()
export class CommentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly realtimeGateway: TaskRealtimeGateway,
    ) {}

    async list(
        workspaceId: string,
        projectId: string,
        taskId: string,
        currentUserId: string,
    ) {
        await this.assertTaskAccess(
            workspaceId,
            projectId,
            taskId,
            currentUserId,
        );

        return this.prisma.comment.findMany({
            where: {
                taskId,
            },
            orderBy: {
                createdAt: 'desc',
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
    }

    async create(
        workspaceId: string,
        projectId: string,
        taskId: string,
        currentUserId: string,
        content: string,
    ) {
        await this.assertTaskAccess(
            workspaceId,
            projectId,
            taskId,
            currentUserId,
        );

        const comment = await this.prisma.comment.create({
            data: {
                taskId,
                userId: currentUserId,
                content,
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

        this.realtimeGateway.emitCommentCreated(projectId, taskId, comment);

        return comment;
    }

    async update(
        workspaceId: string,
        projectId: string,
        taskId: string,
        commentId: string,
        currentUserId: string,
        content: string,
    ) {
        await this.assertTaskAccess(
            workspaceId,
            projectId,
            taskId,
            currentUserId,
        );

        const comment = await this.prisma.comment.findFirst({
            where: {
                id: commentId,
                taskId,
            },
        });

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        if (comment.userId !== currentUserId) {
            const currentMember = await this.prisma.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: currentUserId,
                        projectId,
                    },
                },
            });

            if (!currentMember || currentMember.role !== 'OWNER') {
                throw new ForbiddenException(
                    'Only comment author can edit this comment',
                );
            }
        }

        const updatedComment = await this.prisma.comment.update({
            where: {
                id: commentId,
            },
            data: {
                content,
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

        this.realtimeGateway.emitCommentUpdated(
            projectId,
            taskId,
            updatedComment,
        );

        return updatedComment;
    }

    async remove(
        workspaceId: string,
        projectId: string,
        taskId: string,
        commentId: string,
        currentUserId: string,
    ) {
        await this.assertTaskAccess(
            workspaceId,
            projectId,
            taskId,
            currentUserId,
        );

        const comment = await this.prisma.comment.findFirst({
            where: {
                id: commentId,
                taskId,
            },
        });

        if (!comment) {
            throw new NotFoundException('Comment not found');
        }

        if (comment.userId !== currentUserId) {
            const currentMember = await this.prisma.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId: currentUserId,
                        projectId,
                    },
                },
            });

            if (!currentMember || currentMember.role !== 'OWNER') {
                throw new ForbiddenException(
                    'Only comment author can delete this comment',
                );
            }
        }

        await this.prisma.comment.delete({
            where: {
                id: commentId,
            },
        });

        this.realtimeGateway.emitCommentDeleted(projectId, taskId, commentId);

        return {
            message: 'Comment deleted',
        };
    }

    private async assertTaskAccess(
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
    }
}
