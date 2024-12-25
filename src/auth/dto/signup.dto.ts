import { ApiProperty } from '@nestjs/swagger';
import { IsAlphanumeric, IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';
import { LowerCase, Trim } from '../../utils/custom-validation.util';

export class SignupDto {
    @ApiProperty({ example: 'example@email.com' })
    @Trim()
    @LowerCase()
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Abcd1234' })
    @IsString()
    @IsAlphanumeric()
    @Length(6, 10)
    password: string;

    @ApiProperty({ example: 'string' })
    @IsString()
    @IsNotEmpty()
    uuid: string;
}
