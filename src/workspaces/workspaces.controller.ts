import {
    Body,
    Controller,
    Post,
    Delete,
    Param,
    Get,
    Patch,
    Req,
    UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AccessTokenGuard } from '../auth/guards/access-token.guard';

import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Controller('workspaces')
@UseGuards(AccessTokenGuard)
export class WorkspacesController {
    constructor(private readonly workspacesService: WorkspacesService) {}

    @Post()
    create(@Body() dto: CreateWorkspaceDto, @Req() request: Request) {
        return this.workspacesService.create(dto.name, request.user!.id);
    }

    @Get()
    findAll(@Req() request: Request) {
        return this.workspacesService.findAll(request.user!.id);
    }

    @Patch(':id')
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
    delete(@Param('id') workspaceId: string, @Req() request: Request) {
        return this.workspacesService.delete(workspaceId, request.user!.id);
    }

    @Post(':id/members')
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
    leave(@Param('id') workspaceId: string, @Req() request: Request) {
        return this.workspacesService.leave(workspaceId, request.user!.id);
    }
}
