import {
    ApiPropertyOptional,
} from '@nestjs/swagger';
import {
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class UpdateProjectDto {
    @ApiPropertyOptional({
        example: 'Updated Website Redesign',
        description: 'New project name.',
        minLength: 1,
        maxLength: 100,
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({
        example: 'Updated project description.',
        description: 'New project description. Can be null to remove it.',
        maxLength: 1000,
        nullable: true,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description?: string | null;
}