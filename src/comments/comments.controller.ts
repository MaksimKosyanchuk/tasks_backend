import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@UseGuards(AccessTokenGuard)
@Controller('workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments')
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    @Get()
    list(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Req() request: Request,
    ) {
        return this.commentsService.list(
            workspaceId,
            projectId,
            taskId,
            request.user!.id,
        );
    }

    @Post()
    create(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Body() dto: CreateCommentDto,
        @Req() request: Request,
    ) {
        return this.commentsService.create(
            workspaceId,
            projectId,
            taskId,
            request.user!.id,
            dto.content,
        );
    }

    @Patch(':commentId')
    update(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Param('commentId') commentId: string,
        @Body() dto: UpdateCommentDto,
        @Req() request: Request,
    ) {
        return this.commentsService.update(
            workspaceId,
            projectId,
            taskId,
            commentId,
            request.user!.id,
            dto.content,
        );
    }

    @Delete(':commentId')
    remove(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Param('commentId') commentId: string,
        @Req() request: Request,
    ) {
        return this.commentsService.remove(
            workspaceId,
            projectId,
            taskId,
            commentId,
            request.user!.id,
        );
    }
}