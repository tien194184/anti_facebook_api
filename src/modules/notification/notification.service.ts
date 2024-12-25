import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from '../../database/entities/post.entity';
import { Repository } from 'typeorm';
import { FriendRequest } from '../../database/entities/friend-request.entity';
import { Notification } from '../../database/entities/notification.entity';
import { Mark } from '../../database/entities/mark.entity';
import { Feel } from '../../database/entities/feel.entity';
import { User } from '../../database/entities/user.entity';
import { CheckNewItemsDto } from './dto/check-new-items.dto';
import { CategoryType } from '../../constants/category-types.enum';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { AuthService } from '../../auth/auth.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';
import { UnwrapResponse } from '../../utils/unwrap-response.util';
import { NotifyAddPostDto } from './dto/notify-add-post.dto';
import { Friend } from '../../database/entities/friend.entity';
import { NotificationType } from '../../constants/notification-type.enum';
import { NotifyEditPostDto } from './dto/notify-edit-post.dto';
import { messaging } from 'firebase-admin';
import { DevToken } from '../../database/entities/dev-token.entity';
import { getFilePath } from '../../utils/get-file-path.util';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class NotificationService {
    constructor(
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(Mark)
        private markRepo: Repository<Mark>,
        @InjectRepository(Feel)
        private feelRepo: Repository<Feel>,
        @InjectRepository(Friend)
        private friendRepo: Repository<Friend>,
        @InjectRepository(FriendRequest)
        private friendRequestRepo: Repository<FriendRequest>,
        @InjectRepository(Notification)
        private notificationRepo: Repository<Notification>,
        @InjectRepository(DevToken)
        private devTokenRepo: Repository<DevToken>,
        private authService: AuthService,
        private settingService: SettingsService,
    ) {}

    mapNotification(notification: Notification) {
        const { id, type, read, target, post, mark, feel, createdAt } = notification;
        return {
            type: String(type),
            object_id: String(post?.id || target?.id || 0),
            title: 'Notification',
            notification_id: String(id),
            created: createdAt,
            avatar: getFilePath(target?.avatar),
            group: post || target ? '1' : '0',
            read: read ? '1' : '0',
            user: target && {
                id: String(target.id),
                username: target.username || '',
                avatar: getFilePath(target.avatar),
            },
            post: post && {
                id: String(post.id),
                described: post.description || '',
                status: post.status || '',
            },
            mark: mark && {
                mark_id: String(mark.id),
                type_of_mark: String(mark.type),
                mark_content: mark.content,
            },
            feel: feel && {
                feel_id: String(feel.id),
                type: String(feel.type),
            },
        };
    }

    async checkNewItems(user: User, { last_id = 0, category_id }: CheckNewItemsDto) {
        let newItems = 0;
        switch (category_id) {
            case CategoryType.Posts:
                newItems = await await this.postRepo
                    .createQueryBuilder('post')
                    .innerJoinAndSelect('post.author', 'author')
                    .leftJoinAndSelect('author.blocked', 'blocked', 'blocked.userId = :userId', {
                        userId: user.id,
                    })
                    .leftJoinAndSelect('author.blocking', 'blocking', 'blocking.targetId = :targetId', {
                        targetId: user.id,
                    })
                    .where('post.id > :last_id', { last_id })
                    .andWhere('blocked.id IS NULL')
                    .andWhere('blocking.id IS NULL')
                    .getCount();
                break;
            case CategoryType.Friends:
                newItems = await this.friendRequestRepo.countBy({ userId: user.id, read: false });
                break;
            case CategoryType.Videos:
                newItems = await this.postRepo
                    .createQueryBuilder('post')
                    .innerJoinAndSelect('post.author', 'author')
                    .innerJoinAndSelect('post.video', 'video')
                    .leftJoinAndSelect('author.blocked', 'blocked', 'blocked.userId = :userId', {
                        userId: user.id,
                    })
                    .leftJoinAndSelect('author.blocking', 'blocking', 'blocking.targetId = :targetId', {
                        targetId: user.id,
                    })
                    .where('post.id > :last_id', { last_id })
                    .andWhere('blocked.id IS NULL')
                    .andWhere('blocking.id IS NULL')
                    .getCount();
                break;
            case CategoryType.Notifications:
                newItems = await this.notificationRepo.countBy({ userId: user.id, read: false });
        }

        return { new_items: String(newItems) };
    }

    async createNotification(data: CreateNotificationDto) {
        const { type, userId = 0, targetId, postId, markId, feelId, coins } = data;
        let { user, target, post, mark, feel } = data;

        if ((user?.id || userId) === (target?.id || targetId || -1)) {
            return;
        }

        user ??= await this.authService.getUserById(userId);
        target ??= targetId ? await this.authService.getUserById(targetId) : undefined;
        post ??= postId ? await this.postRepo.findOneBy({ id: postId }) : undefined;
        mark ??= markId ? await this.markRepo.findOneBy({ id: markId }) : undefined;
        feel ??= feelId ? await this.feelRepo.findOneBy({ id: feelId }) : undefined;

        const notification = new Notification({
            type,
            user,
            target,
            post,
            mark,
            feel,
            coins: coins ?? undefined,
        });
        await this.notificationRepo.save(notification);

        const pushSettings = await this.settingService.getUserPushSettings(user);
        if (pushSettings.notificationOn) {
            const devToken = await this.devTokenRepo.findOneBy({ userId: user.id });
            const token = devToken?.token;
            if (token) {
                messaging().send({
                    token,
                    data: {
                        json: JSON.stringify(this.mapNotification(notification)),
                    },
                    notification: {
                        title: 'Anti-Fakebook notification',
                        body: 'You have a new notification',
                    },
                });
            }
        }
    }

    async getListNotification(user: User, { index, count }: GetNotificationsDto) {
        const [notifications, total] = await this.notificationRepo
            .createQueryBuilder('notification')
            .leftJoinAndSelect('notification.target', 'target')
            .leftJoin('target.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
            .leftJoin('target.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
            .leftJoinAndSelect('notification.post', 'post')
            .leftJoinAndSelect('notification.mark', 'mark')
            .leftJoinAndSelect('notification.feel', 'feel')
            .where({ userId: user.id })
            .andWhere('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .orderBy('notification.id', 'DESC')
            .take(count)
            .skip(index)
            .getManyAndCount();

        setTimeout(() => {
            for (const notification of notifications) {
                notification.read = true;
            }
            this.notificationRepo.save(notifications);
        }, 1);

        return new UnwrapResponse({
            data: notifications.map(this.mapNotification),
            last_update: new Date(),
            badge: String(total - notifications.length),
        });
    }

    async notifyAddPost({ post, author }: NotifyAddPostDto) {
        const friends = await this.friendRepo.find({
            where: { userId: author.id },
            relations: ['target'],
        });

        await friends.forEachAsync(async ({ target }) => {
            const pushSettings = await this.settingService.getUserPushSettings(target);
            const receiveNotification = pushSettings.fromFriends;
            if (receiveNotification) {
                await this.createNotification({
                    type: post.video ? NotificationType.VideoAdded : NotificationType.PostAdded,
                    user: target,
                    target: author,
                    post,
                });
            }
        });
    }

    async notifyEditPost({ post, author }: NotifyEditPostDto) {
        await post.marks.forEachAsync(async (mark) => {
            if (mark.userId === author.id) {
                return;
            }
            await this.createNotification({
                type: NotificationType.PostUpdated,
                userId: mark.userId,
                target: author,
                post,
                mark,
            });
        });
    }
}
