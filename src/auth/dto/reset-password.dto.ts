import { ApiProperty } from '@nestjs/swagger';
import { IsAlphanumeric, IsEmail, IsString, Length, Matches } from 'class-validator';
import { LowerCase, Trim } from '../../utils/custom-validation.util';

export class ResetPasswordDto {
    @ApiProperty({ example: 'example@email.com' })
    @Trim()
    @LowerCase()
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @Matches(/^\d+/)
    code: string;

    @ApiProperty({ example: 'Abcd1234' })
    @IsString()
    @IsAlphanumeric()
    @Length(6, 10)
    password: string;
}
