import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { LowerCase, Trim } from '../../utils/custom-validation.util';

export class GetVerifyCodeDto {
    @ApiProperty({ example: 'example@email.com' })
    @Trim()
    @LowerCase()
    @IsEmail()
    email: string;
}
