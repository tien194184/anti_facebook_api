import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/database/entities/post.entity';
import { User } from 'src/database/entities/user.entity';
import { DataSource, Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { MarkType } from 'src/constants/mark-type.enum';
import { FeelType } from 'src/constants/feel-type.enum';
import { concurrent } from 'src/utils/concurrent.util';
import { getFilePath } from 'src/utils/get-file-path.util';
import { getBanned } from 'src/utils/get-post-subdata.util';
import { RatePostDto } from './dto/rate-post.dto';
import { AppException } from 'src/exceptions/app.exception';
import { costs } from 'src/constants/costs.constant';
import { NotificationType } from 'src/constants/notification-type.enum';
import { GetPostToRateDto } from './dto/get-posts.dto';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectDataSource()
        private dataSource: DataSource,
        private notificationService: NotificationService,
    ) {}
    async getAllPostsToRate(user: User, { index, count }: GetPostToRateDto) {
        const query = this.postRepo
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.author', 'author')
            .loadRelationCountAndMap('post.trustCount', 'post.marks', 'trustCount', (qb) => {
                return qb.where('type = :type', { type: MarkType.Trust });
            })
            .loadRelationCountAndMap('post.fakeCount', 'post.marks', 'fakeCount', (qb) => {
                return qb.where('type = :type', { type: MarkType.Fake });
            })
            .loadRelationCountAndMap('post.kudosCount', 'post.feels', 'kudosCount', (qb) => {
                return qb.where('type = :type', { type: FeelType.Kudos });
            })
            .loadRelationCountAndMap('post.disappointedCount', 'post.feels', 'disappointedCount', (qb) => {
                return qb.where('type = :type', { type: FeelType.Disappointed });
            })
            .leftJoinAndSelect('post.video', 'video')
            .leftJoinAndSelect('post.images', 'images')
            .orderBy({ 'post.id': 'DESC' })
            .take(count)
            .skip(index);

        const [posts, total] = await query.getManyAndCount();

        return {
            total: total,
            items: posts.map((post) => ({
                id: String(post.id),
                name: '',
                image: post.images
                    ?.sort((a, b) => a.order - b.order)
                    ?.map((e) => ({
                        id: String(e.order),
                        url: getFilePath(e.url),
                    })),
                rate: post.rate ? String(post.rate) : '-1',
                video: post.video ? { url: getFilePath(post.video.url) } : undefined,
                described: post.description || '',
                created: post.createdAt,
                banned: getBanned(post),
                state: post.status || '',
                author: {
                    id: String(post.author.id),
                    name: post.author.username || '',
                    avatar: getFilePath(post.author.avatar),
                },
                trust_count: post.trustCount,
                fake_count: post.fakeCount,
                kudos_count: post.kudosCount,
                disappointed_count: post.disappointedCount,
            })),
        };
    }

    async ratePost(user: User, { id, rate }: RatePostDto) {
        return this.dataSource.transaction(async (manager) => {
            const postRepo = manager.getRepository(Post);
            const userRepo = manager.getRepository(User);
            const post = await postRepo
                .createQueryBuilder('posts')
                .where({ id })
                .leftJoinAndSelect('posts.author', 'author')
                .leftJoinAndSelect('posts.feels', 'feels')
                .leftJoinAndSelect('feels.user', 'feelOfUser')
                .leftJoinAndSelect('posts.marks', 'marks')
                .leftJoinAndSelect('marks.user', 'markedUser')
                .getOne();

            if (!post) {
                throw new AppException(9992, 404);
            }

            if (post.rate !== null) {
                throw new AppException(5001);
            }

            post.rate = rate;
            await postRepo.save(post);

            const checkAuthor = async () => {
                const coefficient = rate === MarkType.Fake ? 0 : 3;
                post.author.coins += coefficient * costs.createPost;

                await userRepo.save(post.author);
                await this.notificationService.createNotification({
                    type: NotificationType.PlusCoins,
                    userId: user.id,
                    targetId: post.author.id,
                    postId: post.id,
                    coins: coefficient * costs.createPost,
                });
            };

            const checkFeels = post.feels.map((feel) => {
                const { user: feelOfUser, type } = feel;
                const feelCoefficient = type === Number(rate) ? 3 : -1;

                feelOfUser.coins += feelCoefficient * costs.createFeel;
                const feelNotify = () =>
                    this.notificationService.createNotification({
                        type: NotificationType.PlusCoins,
                        userId: user.id,
                        targetId: feelOfUser.id,
                        postId: post.id,
                        coins: feelCoefficient * costs.createFeel,
                    });

                return async () => {
                    await userRepo.save(feelOfUser);
                    await feelNotify();
                };
            });
            const checkMarks = post.marks.map((mark) => {
                const { user: markedUser, type } = mark;
                const markCoefficient = type === Number(mark) ? 3 : -1;

                markedUser.coins += markCoefficient * costs.createMark;
                const markNotify = () =>
                    this.notificationService.createNotification({
                        type: NotificationType.PlusCoins,
                        userId: user.id,
                        targetId: markedUser.id,
                        postId: post.id,
                        markId: mark.id,
                        coins: markCoefficient * costs.createMark,
                    });

                return async () => {
                    await userRepo.save(markedUser);
                    await markNotify();
                };
            });

            await concurrent([checkAuthor, ...checkFeels, ...checkMarks]);

            return;
        });
    }
}
