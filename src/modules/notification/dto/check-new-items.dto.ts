import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { CategoryType } from '../../../constants/category-types.enum';

export class CheckNewItemsDto {
    @ApiProperty({ type: 'string', example: '3' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    last_id: number;

    @ApiProperty({ type: 'string', example: '1' })
    @IsOptional()
    @Type(() => Number)
    @IsEnum(CategoryType)
    category_id: CategoryType;
}
