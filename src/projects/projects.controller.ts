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

import { AccessTokenGuard } from '../auth/guards/access-token.guard';

import { CreateProjectDto } from './dto/create-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectsService } from './projects.service';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@ApiTags('Projects')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/projects')
@UseGuards(AccessTokenGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    @Post()
    @ApiOperation({
        summary: 'Create project',
    })
    @ApiParam({
        name: 'workspaceId',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiBody({
        type: CreateProjectDto,
    })
    @ApiResponse({
        status: 201,
        description: 'Project successfully created.',
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
        description: 'User does not have permission to create a project.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace not found.',
    })
    create(
        @Param('workspaceId') workspaceId: string,
        @Body() dto: CreateProjectDto,
        @Req() request: Request,
    ) {
        return this.projectsService.create(
            workspaceId,
            request.user!.id,
            dto.name,
            dto.description,
        );
    }

    @Get()
    @ApiOperation({
        summary: 'Get workspace projects',
    })
    @ApiParam({
        name: 'workspaceId',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'List of projects in the workspace.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have access to this workspace.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace not found.',
    })
    findAll(
        @Param('workspaceId') workspaceId: string,
        @Req() request: Request,
    ) {
        return this.projectsService.findAll(workspaceId, request.user!.id);
    }

    @Post(':projectId/members')
    @ApiOperation({
        summary: 'Add member to project',
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
    @ApiBody({
        type: AddProjectMemberDto,
    })
    @ApiResponse({
        status: 201,
        description: 'Member successfully added to the project.',
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
        description: 'User does not have permission to add project members.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or user not found.',
    })
    @ApiResponse({
        status: 409,
        description: 'User is already a member of the project.',
    })
    addMember(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Body() dto: AddProjectMemberDto,
        @Req() request: Request,
    ) {
        return this.projectsService.addMember(
            workspaceId,
            projectId,
            request.user!.id,
            dto.email,
        );
    }

    @Patch(':projectId/members/:userId')
    @ApiOperation({
        summary: 'Update project member role',
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
        name: 'userId',
        description: 'User ID whose role will be updated',
        example: '770e8400-e29b-41d4-a716-446655440222',
    })
    @ApiBody({
        type: UpdateProjectMemberDto,
    })
    @ApiResponse({
        status: 200,
        description: 'Project member role successfully updated.',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid project role.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have permission to update member roles.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or member not found.',
    })
    updateMemberRole(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('userId') targetUserId: string,
        @Body() dto: UpdateProjectMemberDto,
        @Req() request: Request,
    ) {
        return this.projectsService.updateMemberRole(
            workspaceId,
            projectId,
            request.user!.id,
            targetUserId,
            dto.role,
        );
    }

    @Delete(':projectId/members/:userId')
    @ApiOperation({
        summary: 'Remove member from project',
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
        name: 'userId',
        description: 'User ID of the member to remove',
        example: '770e8400-e29b-41d4-a716-446655440222',
    })
    @ApiResponse({
        status: 200,
        description: 'Member successfully removed from the project.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have permission to remove project members.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace, project, or member not found.',
    })
    removeMember(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('userId') memberId: string,
        @Req() request: Request,
    ) {
        return this.projectsService.removeMember(
            workspaceId,
            projectId,
            request.user!.id,
            memberId,
        );
    }

    @Patch(':projectId')
    @ApiOperation({
        summary: 'Update project',
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
    @ApiBody({
        type: UpdateProjectDto,
    })
    @ApiResponse({
        status: 200,
        description: 'Project successfully updated.',
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
        description: 'User does not have permission to update this project.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace or project not found.',
    })
    update(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Body() dto: UpdateProjectDto,
        @Req() request: Request,
    ) {
        return this.projectsService.update(
            workspaceId,
            projectId,
            request.user!.id,
            dto.name,
            dto.description,
        );
    }

    @Delete(':projectId')
    @ApiOperation({
        summary: 'Delete project',
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
        status: 200,
        description: 'Project successfully deleted.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have permission to delete this project.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace or project not found.',
    })
    delete(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Req() request: Request,
    ) {
        return this.projectsService.delete(
            workspaceId,
            projectId,
            request.user!.id,
        );
    }

    @Get(':projectId')
    @ApiOperation({
        summary: 'Get project by ID',
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
        status: 200,
        description: 'Project details.',
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
    getById(
        @Param('workspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Req() request: Request,
    ) {
        return this.projectsService.getById(
            workspaceId,
            projectId,
            request.user!.id,
        );
    }
}