import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty({
        example: 'I have completed the authentication part.',
        description: 'Comment content.',
        minLength: 1,
        maxLength: 2000,
    })
    @IsString()
    @MinLength(1)
    @MaxLength(2000)
    content: string;
}