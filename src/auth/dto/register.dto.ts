import {
    IsEmail,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({
        example: 'john@example.com',
        description: 'User email address.',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        example: 'john_doe',
        description: 'Unique username.',
        minLength: 3,
        maxLength: 20,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    nickName: string;

    @ApiProperty({
        example: 'StrongPassword123',
        description: 'User password.',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    password: string;
}