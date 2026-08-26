import { IsEmail } from 'class-validator';

export class AddProjectMemberDto {
    @IsEmail()
    email: string;
}