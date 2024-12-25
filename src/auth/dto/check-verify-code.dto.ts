import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches } from 'class-validator';
import { LowerCase, Trim } from '../../utils/custom-validation.util';

export class CheckVerifyCodeDto {
    @ApiProperty({ example: 'example@email.com' })
    @Trim()
    @LowerCase()
    @IsEmail()
    email: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @Matches(/^\d+/)
    code_verify: string;
}
