import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt } from 'class-validator';
import { MarkType } from 'src/constants/mark-type.enum';

export class RatePostDto {
    @ApiProperty({ type: 'string', example: '1' })
    @Type(() => Number)
    @IsInt()
    id: number;

    @ApiProperty({ type: 'string', example: MarkType.Trust })
    @Type(() => Number)
    @IsEnum(MarkType)
    rate: MarkType;
}
