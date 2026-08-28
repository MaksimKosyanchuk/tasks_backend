import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TaskRealtimeGateway } from './task-realtime.gateway';
import { CommentsController } from 'src/comments/comments.controller';
import { CommentsService } from 'src/comments/comments.service';

@Module({
    imports: [AuthModule, PrismaModule],
    controllers: [TasksController, CommentsController],
    providers: [TasksService, CommentsService, TaskRealtimeGateway],
})
export class TasksModule {}
