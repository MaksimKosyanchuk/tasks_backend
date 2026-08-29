import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class AddProjectMemberDto {
    @ApiProperty({
        example: 'john@example.com',
        description: 'Email of the user to add to the project.',
    })
    @IsEmail()
    email: string;
}