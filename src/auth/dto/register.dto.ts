import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(3)
    @MaxLength(20)
    nickName: string;

    @IsString()
    @MinLength(8)
    password: string;
}