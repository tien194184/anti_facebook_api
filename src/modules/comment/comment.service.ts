import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from '../../database/entities/comment.entity';
import { User } from '../../database/entities/user.entity';
import { Mark } from '../../database/entities/mark.entity';
import { SetMarkCommentDto } from './dto/set-mark-comment.dto';
import { AppException } from '../../exceptions/app.exception';
import { Post } from '../../database/entities/post.entity';
import { BlockService } from '../block/block.service';
import { costs } from '../../constants/costs.constant';
import { GetMarkCommentDto } from './dto/get-mark-comment.dto';
import { isNotEmpty } from 'class-validator';
import { UnwrapResponse } from '../../utils/unwrap-response.util';
import { FeelDto } from './dto/feel.dto';
import { Feel } from '../../database/entities/feel.entity';
import { FeelType } from '../../constants/feel-type.enum';
import { GetListFeelsDto } from './dto/get-list-feels.dto';
import { DeleteFeelDto } from './dto/delete-feel.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../../constants/notification-type.enum';
import { Notification } from '../../database/entities/notification.entity';
import { getFilePath } from '../../utils/get-file-path.util';

@Injectable()
export class CommentService {
    constructor(
        @InjectRepository(Comment)
        private commentRepo: Repository<Comment>,
        @InjectRepository(Mark)
        private markRepo: Repository<Mark>,
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Feel)
        private feelRepo: Repository<Feel>,
        @InjectRepository(Notification)
        private notificationRepo: Repository<Notification>,
        private blockService: BlockService,
        private notificationService: NotificationService,
    ) {}

    async getMarkComment(user: User, { id, index, count }: GetMarkCommentDto) {
        const post = await this.postRepo.findOneBy({ id });

        if (!post) {
            throw new AppException(9992, 404);
        }

        if (await this.blockService.isBlock(user.id, post.authorId)) {
            throw new AppException(3001);
        }

        const marks = await this.markRepo
            .createQueryBuilder('mark')
            .innerJoinAndSelect('mark.user', 'user')
            .leftJoin('user.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
            .leftJoin('user.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
            .orderBy({ 'mark.id': 'DESC' })
            .where({ postId: id })
            .andWhere('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .skip(index)
            .take(count)
            .getMany();

        await marks.forEachAsync(async (mark) => {
            mark.comments = await this.commentRepo
                .createQueryBuilder('comment')
                .innerJoinAndSelect('comment.user', 'user')
                .leftJoin('user.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
                .leftJoin('user.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
                .orderBy({ 'comment.id': 'ASC' })
                .where({ markId: mark.id })
                .andWhere('blocked.id IS NULL')
                .andWhere('blocking.id IS NULL')
                .getMany();
        });

        return marks.map((mark) => ({
            id: String(mark.id),
            mark_content: mark.content,
            type_of_mark: String(mark.type),
            created: mark.createdAt,
            poster: {
                id: String(mark.user.id),
                name: mark.user.username || '',
                avatar: getFilePath(mark.user.avatar),
            },
            comments: mark.comments.map((comment) => ({
                content: comment.content,
                created: comment.createdAt,
                poster: {
                    id: String(comment.user.id),
                    name: comment.user.username || '',
                    avatar: getFilePath(comment.user.avatar),
                },
            })),
        }));
    }

    async setMarkComment(user: User, { id, content, index, count, mark_id, type }: SetMarkCommentDto) {
        if (mark_id) {
            // comment
            const mark = await this.markRepo.findOne({
                where: { id: mark_id },
                relations: ['post'],
            });

            if (!mark) {
                throw new AppException(9994, 404);
            }

            if (
                (await this.blockService.isBlock(mark.post.authorId, user.id)) ||
                (await this.blockService.isBlock(mark.userId, user.id))
            ) {
                throw new AppException(3001);
            }

            id = mark.postId;

            const newComment = new Comment({
                markId: mark_id,
                content,
                userId: user.id,
            });

            await this.commentRepo.save(newComment);

            this.notificationService.createNotification({
                type: NotificationType.PostCommented,
                userId: mark.post.authorId,
                post: mark.post,
                mark,
                target: user,
            });

            mark.userId !== mark.post.authorId &&
                this.notificationService.createNotification({
                    type: NotificationType.MarkCommented,
                    userId: mark.userId,
                    post: mark.post,
                    mark,
                    target: user,
                });
        } else {
            // mark
            const post = await this.postRepo.findOneBy({ id });

            if (!post) {
                throw new AppException(9992, 404);
            }

            if (await this.blockService.isBlock(user.id, post.authorId)) {
                throw new AppException(3001);
            }

            let mark = await this.markRepo.findOneBy({ postId: id, userId: user.id });

            let checkReduceCoins = false;
            if (mark) {
                if (isNotEmpty(type) && type !== mark.type) {
                    if (user.coins < costs.createMark) {
                        throw new AppException(2001);
                    }

                    mark.type = type;
                    checkReduceCoins = true;
                }

                if (content) {
                    mark.content = content;
                }

                await this.markRepo.save(mark);
                await this.notificationRepo.delete({
                    type: NotificationType.PostMarked,
                    targetId: user.id,
                    markId: mark.id,
                });
            } else {
                if (user.coins < costs.createMark) {
                    throw new AppException(2001);
                }

                checkReduceCoins = true;
                mark = new Mark({
                    postId: id,
                    content: content,
                    type: type,
                    userId: user.id,
                });

                await this.markRepo.save(mark);
            }

            if (checkReduceCoins) {
                user.coins -= costs.createMark;
            }
            user.lastActive = new Date();
            await this.userRepo.save(user);

            this.notificationService.createNotification({
                type: NotificationType.PostMarked,
                userId: post.authorId,
                post,
                mark,
                target: user,
            });
        }

        return new UnwrapResponse({
            data: await this.getMarkComment(user, { id, index, count }),
            coins: String(user.coins),
        });
    }

    async feel(user: User, { id, type }: FeelDto) {
        const post = await this.postRepo.findOneBy({ id });

        if (!post) {
            throw new AppException(9992, 404);
        }

        if (await this.blockService.isBlock(user.id, post.authorId)) {
            throw new AppException(3001);
        }

        let feel = await this.feelRepo.findOneBy({ postId: id, userId: user.id });

        let checkReduceCoins = false;
        if (feel) {
            if (type !== feel.type) {
                checkReduceCoins = true;
                feel.type = type;

                await this.notificationRepo.delete({
                    type: NotificationType.PostFelt,
                    targetId: user.id,
                    feelId: feel.id,
                });
            }
        } else {
            checkReduceCoins = true;

            feel = new Feel({
                postId: post.id,
                userId: user.id,
                type,
            });
        }

        if (checkReduceCoins) {
            if (user.coins < costs.createFeel) {
                throw new AppException(2001);
            }
            user.coins -= costs.createFeel;
            await this.userRepo.save(user);

            await this.feelRepo.save(feel);

            this.notificationService.createNotification({
                type: NotificationType.PostFelt,
                userId: post.authorId,
                post,
                target: user,
                feel,
            });
        }

        const [disappointed, kudos] = await Promise.all([
            this.feelRepo.countBy({ postId: id, type: FeelType.Disappointed }),
            this.feelRepo.countBy({ postId: id, type: FeelType.Kudos }),
        ]);

        return new UnwrapResponse({
            data: {
                disappointed: String(disappointed),
                kudos: String(kudos),
            },
            coins: String(user.coins),
        });
    }

    async getListFeels(user: User, { id, index, count }: GetListFeelsDto) {
        const post = await this.postRepo.findOneBy({ id });

        if (!post) {
            throw new AppException(9992, 404);
        }

        if (await this.blockService.isBlock(user.id, post.authorId)) {
            throw new AppException(3001);
        }

        const feels = await this.feelRepo
            .createQueryBuilder('feel')
            .innerJoinAndSelect('feel.user', 'user')
            .leftJoin('user.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
            .leftJoin('user.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
            .orderBy({ 'feel.id': 'DESC' })
            .where({ postId: id })
            .andWhere('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .skip(index)
            .take(count)
            .getMany();

        return feels.map((feel) => ({
            id: String(feel.id),
            feel: {
                user: {
                    id: String(feel.user.id),
                    name: feel.user.username || '',
                    avatar: getFilePath(feel.user.avatar),
                },
                type: String(feel.type),
            },
        }));
    }

    async deleteFeel(user: User, { id }: DeleteFeelDto) {
        const post = await this.postRepo.findOneBy({ id });

        if (!post) {
            throw new AppException(9992, 404);
        }

        if (await this.blockService.isBlock(user.id, post.authorId)) {
            throw new AppException(3001);
        }

        await this.feelRepo.delete({ postId: id, userId: user.id });
        const [disappointed, kudos] = await Promise.all([
            this.feelRepo.countBy({ postId: id, type: FeelType.Disappointed }),
            this.feelRepo.countBy({ postId: id, type: FeelType.Kudos }),
        ]);

        return {
            disappointed: String(disappointed),
            kudos: String(kudos),
        };
    }
}
