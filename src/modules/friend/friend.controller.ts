import { Controller, HttpCode, Post, Body } from '@nestjs/common';
import { FriendService } from './friend.service';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from '../../auth/decorators/auth.decorator';
import { AuthUser } from '../../auth/decorators/user.decorator';
import { User } from '../../database/entities/user.entity';
import { GetListDto } from './dto/get-list.dto';
import { GetListFriendsDto } from './dto/get-list-friends.dto';
import { SetRequestFriendDto } from './dto/set-request-friend.dto';
import { SetAcceptFriend } from './dto/set-accept-friend.dto';
import { UnfriendDto } from './dto/unfriend.dto';
import { DelRequestFriendDto } from './dto/del-request-friend.dto';

@Controller()
@ApiTags('Friend')
@Auth()
export class FriendController {
    constructor(private friendService: FriendService) {}

    @Post('/get_requested_friends')
    @HttpCode(200)
    async getRequestedFriends(@AuthUser() user: User, @Body() body: GetListDto) {
        return this.friendService.getRequestedFriends(user, body);
    }

    @Post('/set_request_friend')
    @HttpCode(200)
    async setRequestFriend(@AuthUser() user: User, @Body() body: SetRequestFriendDto) {
        return this.friendService.setRequestFriend(user, body);
    }

    @Post('/set_accept_friend')
    @HttpCode(200)
    async setAcceptFriend(@AuthUser() user: User, @Body() body: SetAcceptFriend) {
        return this.friendService.setAcceptFriend(user, body);
    }

    @Post('/get_user_friends')
    @HttpCode(200)
    async getUserFriends(@AuthUser() user: User, @Body() body: GetListFriendsDto) {
        return this.friendService.getUserFriends(user, body);
    }

    @Post('/get_suggested_friends')
    @HttpCode(200)
    async getSuggestedFriends(@AuthUser() user: User, @Body() body: GetListDto) {
        return this.friendService.getSuggestedFriends(user, body);
    }

    @Post('/unfriend')
    @HttpCode(200)
    async unfriend(@AuthUser() user: User, @Body() body: UnfriendDto) {
        return this.friendService.setUnfriend(user, body);
    }

    @Post('/del_request_friend')
    @HttpCode(200)
    async delRequestFriend(@AuthUser() user: User, @Body() body: DelRequestFriendDto) {
        return this.friendService.delRequestFriend(user, body);
    }
}
