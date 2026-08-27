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
    @IsString()
    @MinLength(1)
    @MaxLength(200)
    title: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsDateString()
    dueDate: string;

    @IsUUID()
    assigneeId: string;
}