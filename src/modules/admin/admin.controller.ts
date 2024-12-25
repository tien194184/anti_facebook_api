import { RolesGuard } from 'src/auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { Role } from 'src/constants/role.enum';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthUser } from 'src/auth/decorators/user.decorator';
import { User } from 'src/database/entities/user.entity';
import { RatePostDto } from './dto/rate-post.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { GetPostToRateDto } from './dto/get-posts.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Admin')
@Auth()
@Controller()
@UseGuards(RolesGuard)
@Roles([Role.Admin])
export class AdminController {
    constructor(private adminService: AdminService) {}

    @Post('get_posts_to_rate')
    @HttpCode(200)
    async getAllPostsToRate(@AuthUser() user: User, @Body() body: GetPostToRateDto) {
        return this.adminService.getAllPostsToRate(user, body);
    }

    @Post('rate_post')
    @HttpCode(200)
    async ratePost(@AuthUser() user: User, @Body() body: RatePostDto) {
        return this.adminService.ratePost(user, body);
    }
}
