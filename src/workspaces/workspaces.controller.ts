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

import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
@UseGuards(AccessTokenGuard)
export class WorkspacesController {
    constructor(private readonly workspacesService: WorkspacesService) {}

    @Post()
    @ApiOperation({
        summary: 'Create workspace',
    })
    @ApiBody({
        type: CreateWorkspaceDto,
    })
    @ApiResponse({
        status: 201,
        description: 'Workspace successfully created.',
    })
    @ApiResponse({
        status: 400,
        description: 'Validation error.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    create(@Body() dto: CreateWorkspaceDto, @Req() request: Request) {
        return this.workspacesService.create(dto.name, request.user!.id);
    }

    @Get()
    @ApiOperation({
        summary: 'Get user workspaces',
    })
    @ApiResponse({
        status: 200,
        description: 'List of workspaces belonging to the authenticated user.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    findAll(@Req() request: Request) {
        return this.workspacesService.findAll(request.user!.id);
    }

    @Patch(':id')
    @ApiOperation({
        summary: 'Update workspace',
    })
    @ApiParam({
        name: 'id',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiBody({
        type: UpdateWorkspaceDto,
    })
    @ApiResponse({
        status: 200,
        description: 'Workspace successfully updated.',
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
        description: 'User does not have permission to update this workspace.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace not found.',
    })
    update(
        @Param('id') workspaceId: string,
        @Body() dto: UpdateWorkspaceDto,
        @Req() request: Request,
    ) {
        return this.workspacesService.update(
            workspaceId,
            request.user!.id,
            dto.name,
        );
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Delete workspace',
    })
    @ApiParam({
        name: 'id',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Workspace successfully deleted.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'User does not have permission to delete this workspace.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace not found.',
    })
    delete(@Param('id') workspaceId: string, @Req() request: Request) {
        return this.workspacesService.delete(workspaceId, request.user!.id);
    }

    @Post(':id/members')
    @ApiOperation({
        summary: 'Add member to workspace',
    })
    @ApiParam({
        name: 'id',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiBody({
        type: AddMemberDto,
    })
    @ApiResponse({
        status: 201,
        description: 'Member successfully added to the workspace.',
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
        description: 'User does not have permission to add members.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace or user not found.',
    })
    @ApiResponse({
        status: 409,
        description: 'User is already a member of this workspace.',
    })
    addMember(
        @Param('id') workspaceId: string,
        @Body() dto: AddMemberDto,
        @Req() request: Request,
    ) {
        return this.workspacesService.addMember(
            workspaceId,
            request.user!.id,
            dto.email,
        );
    }

    @Delete(':id/members/me')
    @ApiOperation({
        summary: 'Leave workspace',
    })
    @ApiParam({
        name: 'id',
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully left the workspace.',
    })
    @ApiResponse({
        status: 401,
        description: 'Access token is missing or invalid.',
    })
    @ApiResponse({
        status: 403,
        description: 'Workspace owner cannot leave the workspace.',
    })
    @ApiResponse({
        status: 404,
        description: 'Workspace or membership not found.',
    })
    leave(@Param('id') workspaceId: string, @Req() request: Request) {
        return this.workspacesService.leave(workspaceId, request.user!.id);
    }
}