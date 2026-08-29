import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AddMemberDto {
    @ApiProperty({
        example: 'john@example.com',
        description: 'Email of the user to add to the workspace.',
    })
    @IsEmail()
    email: string;
}