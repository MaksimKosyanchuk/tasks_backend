import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { HealthModule } from './health/health.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),

        PrismaModule,
        UsersModule,
        AuthModule,
        WorkspacesModule,
        ProjectsModule,
        TasksModule,

        ThrottlerModule.forRoot([
            {
                ttl: 60_000,
                limit: 10,
            },
        ]),

        HealthModule,
    ],

    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
