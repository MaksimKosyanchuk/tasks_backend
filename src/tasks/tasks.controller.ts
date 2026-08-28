import {
    Body,
    Controller,
    Param,
    Delete,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

@UseGuards(AccessTokenGuard)
@Controller('workspaces/:workspaceId/projects/:projectId/tasks')
export class TasksController {
    constructor(
        private readonly tasksService: TasksService,
    ) {}

    @Post()
    create(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Req() request: Request,
        @Body() dto: CreateTaskDto,
    ) {
        return this.tasksService.create(
            workspaceId,
            projectId,
            request.user!.id,
            dto,
        );
    }

    @Patch(':taskId')
    update(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Req() request: Request,
        @Body() dto: UpdateTaskDto,
    ) {
        return this.tasksService.update(
            workspaceId,
            projectId,
            taskId,
            request.user!.id,
            dto,
        );
    }

    @Delete(':taskId')
    delete(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Req() request: Request,
    ) {
        return this.tasksService.delete(
            workspaceId,
            projectId,
            taskId,
            request.user!.id,
        );
    }
}