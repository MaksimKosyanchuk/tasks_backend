import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';

import { TaskPriority } from '@prisma/client';

export class CreateTaskDto {
    @ApiProperty({
        example: 'Implement authentication',
        description: 'Task title.',
        minLength: 1,
        maxLength: 200,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    title: string;

    @ApiPropertyOptional({
        example: 'Implement JWT authentication and refresh token rotation.',
        description: 'Optional task description.',
        maxLength: 2000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({
        enum: TaskPriority,
        example: TaskPriority.HIGH,
        description: 'Task priority.',
    })
    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiProperty({
        example: '2026-09-15T18:00:00.000Z',
        description: 'Task due date in ISO 8601 format.',
        format: 'date-time',
    })
    @IsDateString()
    dueDate: string;

    @ApiProperty({
        example: '770e8400-e29b-41d4-a716-446655440222',
        description: 'ID of the user assigned to the task.',
    })
    @IsUUID()
    assigneeId: string;
}