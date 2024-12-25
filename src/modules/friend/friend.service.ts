import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Friend } from '../../database/entities/friend.entity';
import { FriendRequest } from '../../database/entities/friend-request.entity';
import { Injectable } from '@nestjs/common';
import { User } from '../../database/entities/user.entity';
import { GetListDto } from './dto/get-list.dto';
import { GetListFriendsDto } from './dto/get-list-friends.dto';
import { SetAcceptFriend } from './dto/set-accept-friend.dto';
import { AppException } from '../../exceptions/app.exception';
import { SetRequestFriendDto } from './dto/set-request-friend.dto';
import { BlockService } from '../block/block.service';
import { AuthService } from '../../auth/auth.service';
import { AccountStatus } from '../../constants/account-status.enum';
import { UnfriendDto } from './dto/unfriend.dto';
import { DelRequestFriendDto } from './dto/del-request-friend.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../constants/notification-type.enum';
import { getFilePath } from '../../utils/get-file-path.util';

@Injectable()
export class FriendService {
    constructor(
        @InjectRepository(Friend)
        private friendRepo: Repository<Friend>,
        @InjectRepository(FriendRequest)
        private friendRequestRepo: Repository<FriendRequest>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        private authService: AuthService,
        private blockService: BlockService,
        private notificationService: NotificationService,
    ) {}

    async getRequestedFriends(user: User, { index = 0, count = 5 }: GetListDto) {
        const [requestedFriends, total] = await this.friendRequestRepo
            .createQueryBuilder('request')
            .where({ targetId: user.id })
            .innerJoinAndSelect('request.user', 'user')
            .loadRelationCountAndMap('user.friendsCount', 'user.friends', 'same_friend', (qb) =>
                qb
                    .innerJoin('same_friend.target', 'target')
                    .innerJoin('target.friends', 'friend', 'friend.targetId = :targetId', { targetId: user.id }),
            )
            .orderBy({ 'request.id': 'DESC' })
            .skip(index)
            .take(count)
            .getManyAndCount();

        for (const friendRequest of requestedFriends) {
            friendRequest.read = true;
        }
        this.friendRequestRepo.save(requestedFriends);

        return {
            requests: requestedFriends.map((requestedFriend) => {
                return {
                    id: String(requestedFriend.user.id),
                    username: requestedFriend.user.username || '',
                    avatar: getFilePath(requestedFriend.user.avatar),
                    same_friends: String(requestedFriend.user.friendsCount),
                    created: requestedFriend.createdAt,
                };
            }),
            total: String(total),
        };
    }

    async setRequestFriend(user: User, { user_id }: SetRequestFriendDto) {
        if (await this.blockService.isBlock(user.id, user_id)) {
            throw new AppException(3001);
        }
        if (user_id === user.id) {
            throw new AppException(4002);
        }
        const existedRequest = await this.friendRequestRepo.findOneBy([
            { userId: user.id, targetId: user_id },
            { userId: user_id, targetId: user.id },
        ]);
        if (existedRequest) {
            throw new AppException(4003);
        }
        const target = await this.authService.getUserById(user_id);

        const newRequest = new FriendRequest({
            userId: user.id,
            targetId: user_id,
        });
        await this.friendRequestRepo.save(newRequest);

        const requestedFriends = await this.friendRequestRepo.countBy({
            userId: user.id,
        });

        this.notificationService.createNotification({
            type: NotificationType.FriendRequest,
            user: target,
            target: user,
        });

        return {
            requested_friends: String(requestedFriends),
        };
    }

    async setAcceptFriend(user: User, { user_id, is_accept }: SetAcceptFriend) {
        const request = await this.friendRequestRepo.findOneBy({
            userId: user_id,
            targetId: user.id,
        });

        if (!request) {
            throw new AppException(9994);
        }

        if (is_accept == '1') {
            const newFriends = [
                new Friend({
                    targetId: user_id,
                    userId: user.id,
                }),
                new Friend({
                    targetId: user.id,
                    userId: user_id,
                }),
            ];

            await this.friendRepo.save(newFriends);

            this.notificationService.createNotification({
                type: NotificationType.FriendAccepted,
                userId: request.userId,
                target: user,
            });
        }

        await this.friendRequestRepo.delete(request.id);

        return {};
    }

    async getUserFriends(user: User, { user_id = user.id, index = 0, count = 5 }: GetListFriendsDto) {
        const [friends, total] = await this.friendRepo
            .createQueryBuilder('friend')
            .innerJoinAndSelect('friend.target', 'target')
            .loadRelationCountAndMap('target.friendsCount', 'target.friends', 'same_friend', (qb) =>
                qb
                    .innerJoin('same_friend.target', 'target')
                    .innerJoin('target.friends', 'friend', 'friend.targetId = :targetId', { targetId: user.id }),
            )
            .where({ userId: user_id })
            .orderBy({ 'friend.id': 'DESC' })
            .skip(index)
            .take(count)
            .getManyAndCount();

        return {
            friends: friends.map((friend) => {
                return {
                    id: String(friend.target.id),
                    username: friend.target.username || '',
                    avatar: getFilePath(friend.target.avatar),
                    same_friends: String(friend.target.friendsCount),
                    created: friend.target.createdAt,
                };
            }),
            total: String(total),
        };
    }

    async getSuggestedFriends(user: User, { index = 0, count = 5 }: GetListDto) {
        const remainUsers = await this.userRepo
            .createQueryBuilder('user')
            .leftJoin('user.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
            .leftJoin('user.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
            .leftJoinAndSelect('user.friends', 'friend', 'friend.targetId = :targetId', { targetId: user.id })
            .leftJoinAndSelect('user.friendRequested', 'requested', 'requested.userId = :userId', { userId: user.id })
            .leftJoinAndSelect('user.friendRequesting', 'requesting', 'requesting.userId = :userId', {
                userId: user.id,
            })
            .where({ id: Not(user.id) })
            .andWhere({ status: Not(AccountStatus.Inactive) })
            .andWhere('friend.id IS NULL')
            .andWhere('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .andWhere('requested.id IS NULL')
            .andWhere('requesting.id IS NULL')
            .loadRelationCountAndMap('user.friendsCount', 'user.friends', 'same_friend', (qb) =>
                qb
                    .innerJoin('same_friend.target', 'target')
                    .innerJoin('target.friends', 'friend', 'friend.targetId = :targetId', { targetId: user.id }),
            )
            .orderBy({ 'user.lastActive': 'DESC', 'user.id': 'ASC' })
            .skip(index)
            .take(count)
            .getMany();

        return remainUsers.map((remainUser) => ({
            id: String(remainUser.id),
            username: remainUser.username || '',
            avatar: getFilePath(remainUser.avatar),
            created: remainUser.createdAt,
            same_friends: String(remainUser.friendsCount),
        }));
    }

    async setUnfriend(user: User, { user_id }: UnfriendDto) {
        await this.authService.getUserById(user_id);

        await this.friendRepo.delete({ userId: user.id, targetId: user_id });
        await this.friendRepo.delete({ userId: user_id, targetId: user.id });

        return {};
    }

    async delRequestFriend(User: User, { user_id }: DelRequestFriendDto) {
        await this.authService.getUserById(user_id);

        await this.friendRequestRepo.delete({ userId: User.id, targetId: user_id });

        return {};
    }
}
