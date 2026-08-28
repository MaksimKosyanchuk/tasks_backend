import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [WorkspacesController],
    providers: [WorkspacesService],
})
export class WorkspacesModule {}
