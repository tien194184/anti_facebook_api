import { FileTypeValidator, MaxFileSizeValidator, ParseFilePipe } from '@nestjs/common';
import { Allow, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppException } from '../../../exceptions/app.exception';
import { mbToBits } from '../../../utils/mb-to-bits.util';

export class ChangeProfileAfterSignupDto {
    @ApiProperty({ example: 'example' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ type: 'file', required: false })
    @Allow()
    avatar: any;
}

export const avatarValidation = new ParseFilePipe({
    validators: [
        new MaxFileSizeValidator({ maxSize: mbToBits(2) }),
        new FileTypeValidator({ fileType: /jpeg|png|jpg|svg/ }),
    ],
    fileIsRequired: false,
    exceptionFactory(error) {
        return new AppException(1003, 400, error);
    },
});
