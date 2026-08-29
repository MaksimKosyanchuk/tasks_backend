import {
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

import { TaskPriority, TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
    @ApiPropertyOptional({
        example: 'Implement authentication',
        description: 'New task title.',
        minLength: 1,
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    title?: string;

    @ApiPropertyOptional({
        example: 'Updated task description.',
        description: 'New task description. Can be null to remove it.',
        maxLength: 1000,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string | null;

    @ApiPropertyOptional({
        enum: TaskStatus,
        example: TaskStatus.DONE,
        description: 'New task status.',
    })
    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiPropertyOptional({
        enum: TaskPriority,
        example: TaskPriority.HIGH,
        description: 'New task priority.',
    })
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional({
        example: '2026-09-20T18:00:00.000Z',
        description: 'New due date in ISO 8601 format. Can be null to remove it.',
        format: 'date-time',
        nullable: true,
    })
    @IsOptional()
    @IsDateString()
    dueDate?: string | null;

    @ApiPropertyOptional({
        example: '770e8400-e29b-41d4-a716-446655440222',
        description: 'ID of the assigned user. Can be null to unassign the task.',
        nullable: true,
    })
    @IsOptional()
    @IsUUID()
    assigneeId?: string | null;
}