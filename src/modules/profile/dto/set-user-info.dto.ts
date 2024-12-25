import { FileValidator, ParseFilePipe } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Allow, IsOptional, IsString } from 'class-validator';
import { mbToBits } from '../../../utils/mb-to-bits.util';
import { FilesArrayMaxSizeValidator, FilesArrayTypeValidator } from '../../../utils/image-validation.util';

export class SetUserInfoDto {
    @ApiProperty({ required: false, type: 'string', example: 'username' })
    @IsOptional()
    @IsString()
    username: string;

    @ApiProperty({ required: false, type: 'string', example: 'description' })
    @IsOptional()
    @IsString()
    description: string;

    @ApiProperty({ required: false, type: 'file' })
    @Allow()
    avatar: any;

    @ApiProperty({ required: false, type: 'string' })
    @IsOptional()
    @IsString()
    address: string;

    @ApiProperty({ required: false, type: 'string' })
    @IsOptional()
    @IsString()
    city: string;

    @ApiProperty({ required: false, type: 'string' })
    @IsOptional()
    @IsString()
    country: string;

    @ApiProperty({ required: false, type: 'file' })
    @Allow()
    cover_image: any;

    @ApiProperty({ required: false, type: 'string' })
    @IsOptional()
    @IsString()
    link: string;
}

class UserInfoFilesValidator extends FileValidator {
    avatarValidator = {
        maxSize: new FilesArrayMaxSizeValidator({ maxSize: mbToBits(2) }),
        fileType: new FilesArrayTypeValidator({ fileType: /jpeg|png|jpg|svg/ }),
    };

    coverImageValidator = {
        maxSize: new FilesArrayMaxSizeValidator({ maxSize: mbToBits(2) }),
        fileType: new FilesArrayTypeValidator({ fileType: /jpeg|png|jpg|svg/ }),
    };

    message = 'unknown error';

    async isValid(body: any) {
        if (body.avatar) {
            if (!this.avatarValidator.fileType.isValid(body.avatar)) {
                this.message = 'avatar: ' + this.avatarValidator.fileType.buildErrorMessage();
                return false;
            }
            if (!this.avatarValidator.maxSize.isValid(body.avatar)) {
                this.message = 'avatar: ' + this.avatarValidator.maxSize.buildErrorMessage();
            }
        }
        if (body.cover_image) {
            if (!this.coverImageValidator.fileType.isValid(body.cover_image)) {
                this.message = 'cover_image: ' + this.coverImageValidator.fileType.buildErrorMessage();
                return false;
            }
            if (!this.coverImageValidator.maxSize.isValid(body.cover_image)) {
                this.message = 'cover_image: ' + this.coverImageValidator.maxSize.buildErrorMessage();
            }
        }

        return true;
    }

    buildErrorMessage() {
        return this.message;
    }
}

export const userInfoValidation = new ParseFilePipe({
    validators: [new UserInfoFilesValidator({})],
    fileIsRequired: false,
});
