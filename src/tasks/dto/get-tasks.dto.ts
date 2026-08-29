import {
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Max,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import { TaskPriority, TaskStatus } from '@prisma/client';

export class GetTasksDto {
    @ApiPropertyOptional({
        description: 'Cursor for pagination.',
        example: 'eyJpZCI6Ijc3MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDIyMiJ9',
    })
    @IsOptional()
    @IsString()
    cursor?: string;

    @ApiPropertyOptional({
        description: 'Number of tasks to return.',
        example: 20,
        minimum: 1,
        maximum: 50,
        type: Number,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50)
    limit?: number;

    @ApiPropertyOptional({
        enum: TaskStatus,
        example: TaskStatus.IN_PROGRESS,
        description: 'Filter tasks by status.',
    })
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiPropertyOptional({
        enum: TaskPriority,
        example: TaskPriority.HIGH,
        description: 'Filter tasks by priority.',
    })
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional({
        description: 'Filter tasks by assigned user ID.',
        example: '770e8400-e29b-41d4-a716-446655440222',
    })
    @IsOptional()
    @IsString()
    assigneeId?: string;
}