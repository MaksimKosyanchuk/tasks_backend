import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class CreateProjectDto {
    @ApiProperty({
        example: 'Website Redesign',
        description: 'Project name.',
        minLength: 1,
        maxLength: 100,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        example: 'Redesign the company website and improve UX.',
        description: 'Optional project description.',
        maxLength: 1000,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string;
}