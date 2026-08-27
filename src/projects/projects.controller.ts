import {
    Body,
    Controller,
    Param,
    Patch,
    Post,
    Get,
    Req,
    UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';

import { CreateProjectDto } from './dto/create-project.dto';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectsService } from './projects.service';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';

@Controller('workspaces/:workspaceId/projects')
@UseGuards(AccessTokenGuard)
export class ProjectsController {
    constructor(
        private readonly projectsService: ProjectsService,
    ) {}

    @Post()
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
    findAll(
        @Param('workspaceId') workspaceId: string,
        @Req() request: Request,
    ) {
        return this.projectsService.findAll(
            workspaceId,
            request.user!.id,
        );
    }

    @Post(':projectId/members')
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
    updateMemberRole(
        @Param('worspaceId') workspaceId: string,
        @Param('projectId') projectId: string,
        @Param('userId') targetUserId: string,
        @Body() dto: UpdateProjectMemberDto,
        @Req() request: Request
    ) {
        return this.projectsService.updateMemberRole(
            workspaceId,
            projectId,
            request.user!.id,
            targetUserId,
            dto.role
        )
    }

    
}