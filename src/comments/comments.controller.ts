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
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller(
    'workspaces/:workspaceId/projects/:projectId/tasks/:taskId/comments',
)
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) {}

    @Get()
    @ApiOperation({
        summary: 'Get task comments',
    })
    @ApiParam({
        name: 'workspaceId',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiParam({
        name: 'projectId',
        description: 'Project ID',
        example: '660e8400-e29b-41d4-a716-446655440111',
    })
    @ApiParam({
        name: 'taskId',
        description: 'Task ID',
        example: '880e8400-e29b-41d4-a716-446655440333',
    })
    @ApiResponse({
        status: 200,
        description: 'Comments successfully retrieved.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have access to this task.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or task not found.',
    })
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
    @ApiOperation({
        summary: 'Create comment',
    })
    @ApiParam({
        name: 'workspaceId',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiParam({
        name: 'projectId',
        description: 'Project ID',
        example: '660e8400-e29b-41d4-a716-446655440111',
    })
    @ApiParam({
        name: 'taskId',
        description: 'Task ID',
        example: '880e8400-e29b-41d4-a716-446655440333',
    })
    @ApiBody({
        type: CreateCommentDto,
    })
    @ApiResponse({
        status: 201,
        description: 'Comment successfully created.',
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have access to this task.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or task not found.',
    })
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
    @ApiOperation({
        summary: 'Update comment',
    })
    @ApiParam({
        name: 'workspaceId',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiParam({
        name: 'projectId',
        description: 'Project ID',
        example: '660e8400-e29b-41d4-a716-446655440111',
    })
    @ApiParam({
        name: 'taskId',
        description: 'Task ID',
        example: '880e8400-e29b-41d4-a716-446655440333',
    })
    @ApiParam({
        name: 'commentId',
        description: 'Comment ID',
        example: '990e8400-e29b-41d4-a716-446655440444',
    })
    @ApiBody({
        type: UpdateCommentDto,
    })
    @ApiResponse({
        status: 200,
        description: 'Comment successfully updated.',
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have permission to update this comment.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, task, or comment not found.',
    })
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
    @ApiOperation({
        summary: 'Delete comment',
    })
    @ApiParam({
        name: 'workspaceId',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiParam({
        name: 'projectId',
        description: 'Project ID',
        example: '660e8400-e29b-41d4-a716-446655440111',
    })
    @ApiParam({
        name: 'taskId',
        description: 'Task ID',
        example: '880e8400-e29b-41d4-a716-446655440333',
    })
    @ApiParam({
        name: 'commentId',
        description: 'Comment ID',
        example: '990e8400-e29b-41d4-a716-446655440444',
    })
    @ApiResponse({
        status: 200,
        description: 'Comment successfully deleted.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have permission to delete this comment.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, task, or comment not found.',
    })
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