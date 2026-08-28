import {
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AuthJwtService } from '../auth/jwt/jwt.service';
import { PrismaService } from '../prisma/prisma.service';

type ProjectEvent = {
    type:
        | 'task.created'
        | 'task.updated'
        | 'task.deleted'
        | 'task.history.created'
        | 'comment.created'
        | 'comment.updated'
        | 'comment.deleted';
    projectId: string;
    taskId?: string;
    task?: unknown;
    comment?: unknown;
    history?: unknown;
};

type SocketData = {
    userId?: string;
    projectRoom?: string;
};

type AuthenticatedSocket = Socket<
    Record<string, never>,
    Record<string, never>,
    Record<string, never>,
    SocketData
>;

@Injectable()
@WebSocketGateway({
    cors: {
        origin: 'http://localhost:5173',
        credentials: true,
    },
})
export class TaskRealtimeGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly prisma: PrismaService,
        private readonly authJwtService: AuthJwtService,
    ) {}

    handleConnection(client: AuthenticatedSocket) {
        const token: unknown = client.handshake.auth?.token;

        if (typeof token !== 'string' || !token) {
            client.disconnect(true);
            return;
        }

        try {
            const payload = this.authJwtService.verifyAccessToken<{
                sub: string;
            }>(token);

            client.data.userId = payload.sub;
        } catch {
            client.disconnect(true);
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        if (client.data.projectRoom) {
            void client.leave(client.data.projectRoom);
        }
    }

    @SubscribeMessage('project:join')
    async joinProject(
        @MessageBody()
        data: {
            projectId: string;
        },
        @ConnectedSocket() client: AuthenticatedSocket,
    ) {
        if (!client.data.userId) {
            throw new UnauthorizedException('Unauthorized');
        }

        const projectMember = await this.prisma.projectMember.findUnique({
            where: {
                userId_projectId: {
                    userId: client.data.userId,
                    projectId: data.projectId,
                },
            },
        });

        if (!projectMember) {
            throw new ForbiddenException('Project not found');
        }

        const room = this.getRoomName(data.projectId);

        await client.join(room);

        client.data.projectRoom = room;

        return {
            joined: true,
        };
    }

    emitTaskCreated(projectId: string, task: unknown) {
        this.emitEvent(projectId, {
            type: 'task.created',
            projectId,
            task,
        });
    }

    emitTaskChanged(projectId: string, task: unknown) {
        this.emitEvent(projectId, {
            type: 'task.updated',
            projectId,
            task,
        });
    }

    emitTaskDeleted(projectId: string, taskId: string) {
        this.emitEvent(projectId, {
            type: 'task.deleted',
            projectId,
            taskId,
        });
    }

    emitHistoryCreated(projectId: string, history: unknown) {
        this.emitEvent(projectId, {
            type: 'task.history.created',
            projectId,
            history,
        });
    }

    emitCommentCreated(projectId: string, taskId: string, comment: unknown) {
        this.emitEvent(projectId, {
            type: 'comment.created',
            projectId,
            taskId,
            comment,
        });
    }

    emitCommentUpdated(projectId: string, taskId: string, comment: unknown) {
        this.emitEvent(projectId, {
            type: 'comment.updated',
            projectId,
            taskId,
            comment,
        });
    }

    emitCommentDeleted(projectId: string, taskId: string, commentId: string) {
        this.emitEvent(projectId, {
            type: 'comment.deleted',
            projectId,
            taskId,
            comment: {
                id: commentId,
            },
        });
    }

    private emitEvent(projectId: string, event: ProjectEvent) {
        this.server
            .to(this.getRoomName(projectId))
            .emit('project:event', event);
    }

    private getRoomName(projectId: string) {
        return `project:${projectId}`;
    }
}
