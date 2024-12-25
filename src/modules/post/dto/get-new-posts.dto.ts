import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class GetNewPostsDto {
    @ApiProperty({ type: 'string', example: '10' })
    @Type(() => Number)
    @IsInt()
    count: number;
}
