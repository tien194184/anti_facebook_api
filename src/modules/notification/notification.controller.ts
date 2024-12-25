import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../auth/decorators/auth.decorator';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthUser } from '../../auth/decorators/user.decorator';
import { User } from '../../database/entities/user.entity';
import { CheckNewItemsDto } from './dto/check-new-items.dto';
import { NotificationService } from './notification.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';

@Controller()
@ApiTags('Notification')
@Auth()
export class NotificationController {
    constructor(private notificationService: NotificationService) {}

    @Post('check_new_items')
    @HttpCode(200)
    async checkNewItems(@AuthUser() user: User, @Body() body: CheckNewItemsDto) {
        return this.notificationService.checkNewItems(user, body);
    }

    @Post('/get_notification')
    @HttpCode(200)
    async getListNotifications(@AuthUser() user: User, @Body() body: GetNotificationsDto) {
        return this.notificationService.getListNotification(user, body);
    }
}
