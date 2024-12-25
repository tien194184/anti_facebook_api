import { Injectable } from '@nestjs/common';
import { User } from 'src/database/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { ChangeProfileAfterSignupDto } from './dto/change-profile-after-signup.dto';
import { Repository } from 'typeorm';
import { AccountStatus } from '../../constants/account-status.enum';
import { AppException } from '../../exceptions/app.exception';
import { getFileName, getFilePath } from '../../utils/get-file-path.util';
import { GetUserInfoDto } from './dto/get-user-info.dto';
import { UserInfo } from '../../database/entities/user-info.entity';
import { Friend } from '../../database/entities/friend.entity';
import { BlockService } from '../block/block.service';
import { SetUserInfoDto } from './dto/set-user-info.dto';
import { getIsFriend } from '../../utils/get-user-info-subdata';
import { FriendRequest } from '../../database/entities/friend-request.entity';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class ProfileService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(UserInfo)
        private userInfoRepository: Repository<UserInfo>,
        @InjectRepository(Friend)
        private friendRepository: Repository<Friend>,
        @InjectRepository(FriendRequest)
        private friendRequestRepository: Repository<FriendRequest>,
        private settingsService: SettingsService,
        private blockService: BlockService,
    ) {}

    async changeProfileAfterSignup(user: User, body: ChangeProfileAfterSignupDto, avatar?: Express.Multer.File) {
        if (![AccountStatus.Pending, AccountStatus.Active].includes(user.status)) {
            throw new AppException(9995);
        }
        user.username = body.username;
        if (avatar) {
            user.avatar = getFileName(avatar);
        }
        user.status = AccountStatus.Active;
        user.deletedAt = null;
        await this.userRepository.save(user);
        this.settingsService.getPushSettings(user);

        return {
            id: String(user.id),
            username: user.username,
            email: user.email,
            created: user.createdAt,
            avatar: getFilePath(user.avatar),
        };
    }

    async getUserInfo(user: User, { user_id }: GetUserInfoDto) {
        user_id ||= user.id;

        if (await this.blockService.isBlock(user.id, user_id)) {
            throw new AppException(3001);
        }

        let userInfo = await this.userInfoRepository
            .createQueryBuilder('userInfo')
            .where({
                userId: user_id,
            })
            .getOne();

        const _user = await this.userRepository.findOneBy({ id: user_id });

        if (!_user) {
            throw new AppException(9995);
        }

        if (!userInfo) {
            userInfo = new UserInfo({ userId: user_id });
        }

        const [totalFriends, friend, friendRequested, friendRequesting] = await Promise.all([
            this.friendRepository.countBy({ userId: user_id || user.id }),
            this.friendRepository.findOneBy({ userId: user.id, targetId: user_id }),
            this.friendRequestRepository.findOneBy({ userId: user.id, targetId: user_id }),
            this.friendRequestRepository.findOneBy({ userId: user_id, targetId: user.id }),
        ]);

        return {
            id: String(_user.id),
            username: _user.username || '',
            created: _user.createdAt,
            description: userInfo.description || '',
            avatar: getFilePath(_user.avatar),
            cover_image: getFilePath(userInfo.coverImage),
            link: userInfo.link || '',
            address: userInfo.address || '',
            city: userInfo.city || '',
            country: userInfo.country || '',
            listing: String(totalFriends),
            is_friend: getIsFriend(friend, friendRequested, friendRequesting),
            online: '1',
            coins: user_id ? String(_user.coins) : '',
        };
    }

    async setUserInfo(
        user: User,
        body: SetUserInfoDto,
        avatar?: Express.Multer.File,
        cover_image?: Express.Multer.File,
    ) {
        let userInfo = await this.userInfoRepository
            .createQueryBuilder('info')
            .where({
                userId: user.id,
            })
            .getOne();

        if (!userInfo) {
            userInfo = new UserInfo({ userId: user.id });
        }

        if (body.username) user.username = body.username;
        if (body.description) userInfo.description = body.description;
        if (body.address) userInfo.address = body.address;
        if (body.city) userInfo.city = body.city;
        if (body.country) userInfo.country = body.country;
        if (body.link) userInfo.link = body.link;
        if (avatar) {
            user.avatar = getFileName(avatar);
        }
        if (cover_image) {
            userInfo.coverImage = getFileName(cover_image);
        }

        user.lastActive = new Date();
        const updatedUserInfo = await this.userInfoRepository.save(userInfo);
        const updatedUser = await this.userRepository.save(user);

        return {
            avatar: getFilePath(updatedUser.avatar),
            cover_image: getFilePath(updatedUserInfo.coverImage),
            link: updatedUserInfo.link || '',
            city: updatedUserInfo.city || '',
            country: updatedUserInfo.country || '',
        };
    }
}
