import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';

import { CreateTaskDto } from './dto/create-task.dto';
import { GetTasksDto } from './dto/get-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('workspaces/:workspaceId/projects/:projectId/tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    @Get()
    @ApiOperation({
        summary: 'Get project tasks',
        description:
            'Returns tasks for a project with optional cursor pagination and filters.',
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
    @ApiQuery({
        name: 'cursor',
        required: false,
        description: 'Cursor for pagination.',
        example: 'eyJpZCI6Ijc3MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDIyMiJ9',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        minimum: 1,
        maximum: 50,
        description: 'Number of tasks to return. Maximum is 50.',
        example: 20,
    })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['TODO', 'IN_PROGRESS', 'DONE'],
        description: 'Filter tasks by status.',
        example: 'IN_PROGRESS',
    })
    @ApiQuery({
        name: 'priority',
        required: false,
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        description: 'Filter tasks by priority.',
        example: 'HIGH',
    })
    @ApiQuery({
        name: 'assigneeId',
        required: false,
        type: String,
        description: 'Filter tasks by assigned user ID.',
        example: '770e8400-e29b-41d4-a716-446655440222',
    })
    @ApiResponse({
        status: 200,
        description: 'Tasks successfully retrieved.',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid query parameters.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have access to this project.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace or project not found.',
    })
    list(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Req() request: Request,
        @Query() query: GetTasksDto,
    ) {
        return this.tasksService.list(
            workspaceId,
            projectId,
            request.user!.id,
            query,
        );
    }

    @Post()
    @ApiOperation({
        summary: 'Create task',
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
    @ApiResponse({
        status: 201,
        description: 'Task successfully created.',
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
        description: 'User does not have permission to create a task.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or assignee not found.',
    })
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
    @ApiOperation({
        summary: 'Update task',
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
        description: 'Task successfully updated.',
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
        description: 'User does not have permission to update this task.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or task not found.',
    })
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

    @Get(':taskId/history')
    @ApiOperation({
        summary: 'Get task history',
        description: 'Returns the history of changes made to a task.',
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
        description: 'Task history successfully retrieved.',
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
    history(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('taskId') taskId: string,
        @Req() request: Request,
    ) {
        return this.tasksService.getHistory(
            workspaceId,
            projectId,
            taskId,
            request.user!.id,
        );
    }

    @Delete(':taskId')
    @ApiOperation({
        summary: 'Delete task',
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
        description: 'Task successfully deleted.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have permission to delete this task.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or task not found.',
    })
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