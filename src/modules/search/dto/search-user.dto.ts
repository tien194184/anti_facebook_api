import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SearchUserDto {
    @ApiProperty({ example: 'Example' })
    @IsString()
    @IsNotEmpty()
    keyword: string;

    @ApiProperty({ type: 'string', example: '0' })
    @Type(() => Number)
    @IsInt()
    index: number;

    @ApiProperty({ type: 'string', example: '10' })
    @Type(() => Number)
    @IsInt()
    count: number;
}
