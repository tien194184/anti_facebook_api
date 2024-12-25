import { Injectable } from '@nestjs/common';
import { AddPostDto } from './dto/add-post.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Post } from '../../database/entities/post.entity';
import { DataSource, Repository } from 'typeorm';
import { PostVideo } from '../../database/entities/post-video.entity';
import { getFileName, getFilePath } from '../../utils/get-file-path.util';
import { PostImage } from '../../database/entities/post-image.entity';
import { User } from '../../database/entities/user.entity';
import { AppException } from '../../exceptions/app.exception';
import { GetPostDto } from './dto/get-post.dto';
import { FeelType } from '../../constants/feel-type.enum';
import { MarkType } from '../../constants/mark-type.enum';
import { costs } from '../../constants/costs.constant';
import { getBanned, getCanEdit, getCanMark, getCanRate, getCategory } from '../../utils/get-post-subdata.util';
import { GetListPostsDto } from './dto/get-list-posts.dto';
import { Comment } from '../../database/entities/comment.entity';
import { EditPostDto } from './dto/edit-post.dto';
import dayjs from 'dayjs';
import { PostHistory } from '../../database/entities/post-history.entity';
import { DeletePostDto } from './dto/delete-post.dto';
import { ReportPostDto } from './dto/report-post.dto';
import { Report } from '../../database/entities/report.entity';
import { GetNewPostsDto } from './dto/get-new-posts.dto';
import { SetViewedPost } from './dto/set-viewed-post.dto';
import { PostView } from '../../database/entities/post-view.entity';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PostService {
    constructor(
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(PostHistory)
        private postHistoryRepo: Repository<PostHistory>,
        @InjectRepository(PostView)
        private postViewRepo: Repository<PostView>,
        @InjectRepository(Report)
        private reportRepo: Repository<Report>,
        @InjectRepository(Comment)
        private commentRepo: Repository<Comment>,
        @InjectDataSource()
        private dataSource: DataSource,
        private notificationService: NotificationService,
    ) {}

    async addPost(user: User, body: AddPostDto, images?: Array<Express.Multer.File>, video?: Express.Multer.File) {
        return this.dataSource.transaction(async (manager) => {
            const userRepo = manager.getRepository(User);
            const postRepo = manager.getRepository(Post);

            if (user.coins < costs.createPost) {
                throw new AppException(2001);
            }
            if (!body.described && !body.status && !images?.length && !video) {
                throw new AppException(1003);
            }

            const post = new Post({
                authorId: user.id,
                description: body.described,
                status: body.status,
                images: [],
            });
            if (video) {
                post.video = new PostVideo({ url: getFileName(video) });
            } else if (images?.length) {
                post.images = images.map((image, i) => {
                    return new PostImage({
                        url: getFileName(image),
                        order: i + 1,
                    });
                });
            }

            user.coins -= costs.createPost;
            user.lastActive = new Date();
            await userRepo.save(user);
            await postRepo.save(post);

            this.notificationService.notifyAddPost({ post, author: user });

            return {
                id: String(post.id),
                coins: String(user.coins),
            };
        });
    }

    async getPost(user: User, { id }: GetPostDto) {
        const post = await this.postRepo
            .createQueryBuilder('post')
            .withDeleted()
            .innerJoinAndSelect('post.author', 'author', 'author.deletedAt IS NULL')
            .leftJoinAndSelect('post.images', 'image')
            .leftJoinAndSelect('post.video', 'video')
            .leftJoinAndSelect('post.histories', 'history')
            .loadRelationCountAndMap('post.kudosCount', 'post.feels', 'feel_kudos', (qb) =>
                qb.where({ type: FeelType.Kudos }),
            )
            .loadRelationCountAndMap('post.disappointedCount', 'post.feels', 'feel_disappointed', (qb) =>
                qb.where({ type: FeelType.Disappointed }),
            )
            .loadRelationCountAndMap('post.trustCount', 'post.marks', 'mark_trust', (qb) =>
                qb.where({ type: MarkType.Trust }),
            )
            .loadRelationCountAndMap('post.fakeCount', 'post.marks', 'mark_fake', (qb) =>
                qb.where({ type: MarkType.Fake }),
            )
            .leftJoinAndMapOne('post.feelOfUser', 'post.feels', 'feel_of_user', 'feel_of_user.userId = :userId', {
                userId: user.id,
            })
            .leftJoinAndMapOne('post.markOfUser', 'post.marks', 'mark_of_user', 'mark_of_user.userId = :userId', {
                userId: user.id,
            })
            .leftJoinAndSelect('author.blocked', 'blocked', 'blocked.userId = :userId', {
                userId: user.id,
            })
            .leftJoinAndSelect('author.blocking', 'blocking', 'blocking.targetId = :targetId', {
                targetId: user.id,
            })
            .where('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .andWhere({ id })
            .orderBy({
                'image.order': 'ASC',
                'history.id': 'DESC',
            })
            .getOne();

        if (!post) {
            throw new AppException(9992, 404);
        }

        return {
            id: String(post.id),
            name: '',
            created: post.createdAt,
            described: post.description || '',
            modified: String(post.edited),
            fake: String(post.fakeCount),
            trust: String(post.trustCount),
            kudos: String(post.kudosCount),
            disappointed: String(post.disappointedCount),
            is_felt: post.feelOfUser ? String(post.feelOfUser.type) : '-1',
            is_marked: post.markOfUser ? '1' : '0',
            your_mark: post.markOfUser
                ? {
                      mark_content: post.markOfUser.content,
                      type_of_mark: String(post.markOfUser.type),
                  }
                : undefined,
            image: post.images.map((e) => ({
                id: String(e.order),
                url: getFilePath(e.url),
            })),
            video: post.video ? { url: getFilePath(post.video.url) } : undefined,
            author: {
                id: String(post.author.id),
                name: post.author.username || '',
                avatar: getFilePath(post.author.avatar),
                coins: String(post.author.coins),
                listing: post.histories.map((e) => String(e.oldPostId)),
            },
            category: getCategory(post),
            state: post.status || '',
            is_blocked: '0',
            can_edit: getCanEdit(post, user),
            banned: getBanned(post),
            can_mark: getCanMark(post, user),
            can_rate: getCanRate(post, user),
            url: '',
            messages: '',
            deleted: post.deletedAt ? post.deletedAt : undefined,
        };
    }

    async getListPosts(user: User, { user_id, last_id, index, count }: GetListPostsDto) {
        const query = this.postRepo
            .createQueryBuilder('post')
            .innerJoinAndSelect('post.author', 'author')
            .leftJoin('author.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
            .leftJoin('author.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
            .leftJoinAndSelect('post.images', 'image')
            .leftJoinAndSelect('post.video', 'video')
            .loadRelationCountAndMap('post.feelsCount', 'post.feels', 'feels_count')
            .loadRelationCountAndMap('post.marksCount', 'post.marks', 'marks_count')
            .leftJoinAndMapOne('post.feelOfUser', 'post.feels', 'feel_of_user', 'feel_of_user.userId = :userId', {
                userId: user.id,
            })
            .where('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .orderBy({ 'post.id': 'DESC' })
            .skip(index)
            .take(count);
        if (last_id) {
            query.andWhere('post.id < :lastId', { lastId: last_id });
        }
        if (user_id) {
            query.andWhere({ authorId: user_id });
        }

        const [posts, total] = await query.getManyAndCount();

        await posts.forEachAsync(async (post) => {
            if (post.marksCount) {
                post.commentsCount = await this.commentRepo.countBy({
                    mark: { postId: post.id },
                });
            } else {
                post.commentsCount = 0;
            }
        });

        const lastId = posts.at(-1)?.id as number;
        const newItems = total - posts.length;

        return {
            post: posts.map((post) => ({
                id: String(post.id),
                name: '',
                image: post.images
                    .sort((a, b) => a.order - b.order)
                    .map((e) => ({
                        id: String(e.order),
                        url: getFilePath(e.url),
                    })),
                video: post.video ? { url: getFilePath(post.video.url) } : undefined,
                described: post.description || '',
                created: post.createdAt,
                feel: String(post.feelsCount),
                comment_mark: String(post.marksCount + post.commentsCount),
                is_felt: post.feelOfUser ? String(post.feelOfUser.type) : '-1',
                is_blocked: '0',
                can_edit: getCanEdit(post, user),
                banned: getBanned(post),
                state: post.status || '',
                author: {
                    id: String(post.author.id),
                    name: post.author.username || '',
                    avatar: getFilePath(post.author.avatar),
                },
            })),
            new_items: String(newItems),
            last_id: String(lastId),
        };
    }

    async editPost(
        user: User,
        { id, described, status, image_sort, image_del }: EditPostDto,
        images: Express.Multer.File[] = [],
        video?: Express.Multer.File,
    ) {
        return this.dataSource.transaction(async (manager) => {
            const userRepo = manager.getRepository(User);
            const postRepo = manager.getRepository(Post);
            const postHistoryRepo = manager.getRepository(PostHistory);

            if (!described && !status && !image_sort && !image_del && !images.length && !video) {
                throw new AppException(1003);
            }

            const post = await postRepo
                .createQueryBuilder('post')
                .leftJoinAndSelect('post.images', 'image')
                .leftJoinAndSelect('post.video', 'video')
                .leftJoinAndSelect('post.marks', 'mark')
                .leftJoinAndSelect('post.feels', 'feel')
                .leftJoinAndSelect('mark.comments', 'comment')
                .where({
                    id,
                    authorId: user.id,
                })
                .orderBy({ 'image.order': 'ASC' })
                .getOne();

            if (!post) {
                throw new AppException(9992, 404);
            }

            if (dayjs(post.createdAt).add(5, 'minutes').isBefore(dayjs())) {
                if (user.coins < costs.editPost) {
                    throw new AppException(2001, 400);
                }
                user.coins -= costs.editPost;
                await userRepo.save(user);
            }

            const oldPost = new Post({
                authorId: post.authorId,
                description: post.description,
                status: post.status,
                images: post.images.map(
                    (image) =>
                        new PostImage({
                            url: image.url,
                            order: image.order,
                        }),
                ),
                video:
                    post.video &&
                    new PostVideo({
                        url: post.video.url,
                    }),
                edited: post.edited,
                deletedAt: new Date(),
            });
            await postRepo.save(oldPost);
            await postHistoryRepo.save(new PostHistory({ postId: post.id, oldPostId: oldPost.id }));

            for (const image of images) {
                post.images.push(new PostImage({ url: getFileName(image) }));
            }
            for (let i = 0; i < post.images.length; i++) {
                post.images[i].order = i + 1;
            }
            const mapImages = Object.fromEntries(post.images.map((e) => [e.order, e]));

            if (image_sort) {
                post.images = [];
                for (const order of image_sort) {
                    if (mapImages[order]) {
                        post.images.push(mapImages[order]);
                    }
                }
            }
            if (image_del) {
                const deleted = Object.fromEntries(image_del.map((e) => [e, true]));
                post.images = post.images.filter((image) => !deleted[image.order]);
            }
            if (described !== undefined && described !== null) {
                post.description = described;
            }
            if (status !== undefined && status !== null) {
                post.status = status;
            }
            if (video) {
                if (post.video) {
                    post.video.url = getFileName(video);
                } else {
                    post.video = new PostVideo({ url: getFileName(video) });
                }
            }
            if (post.video) {
                post.images = [];
            } else {
                post.images = post.images.slice(0, 20);
            }
            for (let i = 0; i < post.images.length; i++) {
                post.images[i].order = i + 1;
            }
            for (const mark of post.marks) {
                mark.editable = true;
            }
            for (const feel of post.feels) {
                feel.editable = true;
            }

            await postRepo.save(post);
            this.notificationService.notifyEditPost({ post, author: user });

            return {
                id: String(post.id),
                coins: String(user.coins),
            };
        });
    }

    async getListVideos(user: User, { last_id, index, count }: GetListPostsDto) {
        const query = this.postRepo
            .createQueryBuilder('post')
            .innerJoinAndSelect('post.author', 'author')
            .leftJoin('author.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
            .leftJoin('author.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
            .innerJoinAndSelect('post.video', 'video')
            .loadRelationCountAndMap('post.feelsCount', 'post.feels', 'feels_count')
            .loadRelationCountAndMap('post.marksCount', 'post.marks', 'marks_count')
            .leftJoinAndMapOne('post.feelOfUser', 'post.feels', 'feel_of_user', 'feel_of_user.userId = :userId', {
                userId: user.id,
            })
            .where('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .orderBy({ 'post.id': 'DESC' })
            .skip(index)
            .take(count);

        if (last_id) {
            query.andWhere('post.id < :lastId', { lastId: last_id });
        }

        const [posts, total] = await query.getManyAndCount();

        await posts.forEachAsync(async (post) => {
            if (post.marksCount) {
                post.commentsCount = await this.commentRepo.countBy({
                    mark: { postId: post.id },
                });
            } else {
                post.commentsCount = 0;
            }
        });

        const lastId = posts.at(-1)?.id as number;
        const newItems = total - posts.length;

        return {
            post: posts.map((post) => ({
                id: String(post.id),
                name: '',
                video: post.video ? { url: getFilePath(post.video.url) } : undefined,
                described: post.description || '',
                created: post.createdAt,
                feel: String(post.feelsCount),
                comment_mark: String(post.marksCount + post.commentsCount),
                is_felt: post.feelOfUser ? String(post.feelOfUser.type) : '-1',
                is_blocked: '0',
                can_edit: getCanEdit(post, user),
                banned: getBanned(post),
                state: post.status || '',
                author: {
                    id: String(post.author.id),
                    name: post.author.username || '',
                    avatar: getFilePath(post.author.avatar),
                },
            })),
            new_items: String(newItems),
            last_id: String(lastId),
        };
    }

    async deletePost(user: User, { id }: DeletePostDto) {
        return this.dataSource.transaction(async (manager) => {
            const postRepo = manager.getRepository(Post);
            const userRepo = manager.getRepository(User);

            const post = await postRepo.findOne({
                where: { id, authorId: user.id },
                relations: ['histories'],
            });

            if (!post) {
                throw new AppException(9992, 404);
            }
            if (post.histories.length) {
                await postRepo.delete(post.histories.map((e) => e.oldPostId));
            }
            await postRepo.remove(post);

            user.coins -= costs.deletePost;
            await userRepo.save(user);

            return { coins: String(user.coins) };
        });
    }

    async reportPost(user: User, { id, subject, details }: ReportPostDto) {
        const post = await this.postRepo.findOneBy({ id });

        if (!post) {
            throw new AppException(9992, 404);
        }

        const report = new Report({
            postId: id,
            subject,
            details,
            userId: user.id,
        });
        await this.reportRepo.save(report);

        return {};
    }

    async getNewPosts(user: User, { count }: GetNewPostsDto) {
        const posts = await this.postRepo
            .createQueryBuilder('post')
            .innerJoinAndSelect('post.author', 'author')
            .leftJoinAndMapOne('post.view', 'post.views', 'view', 'view.userId = :userId', { userId: user.id })
            .leftJoinAndSelect('post.images', 'image')
            .leftJoinAndSelect('post.video', 'video')
            .loadRelationCountAndMap('post.feelsCount', 'post.feels', 'feels_count')
            .loadRelationCountAndMap('post.marksCount', 'post.marks', 'marks_count')
            .leftJoinAndMapOne('post.feelOfUser', 'post.feels', 'feel_of_user', 'feel_of_user.userId = :userId', {
                userId: user.id,
            })
            .leftJoinAndSelect('author.blocked', 'blocked', 'blocked.userId = :userId', {
                userId: user.id,
            })
            .leftJoinAndSelect('author.blocking', 'blocking', 'blocking.targetId = :targetId', {
                targetId: user.id,
            })
            .where('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .orderBy('view.count', 'ASC', 'NULLS FIRST')
            .addOrderBy('post.id', 'DESC')
            .take(count)
            .getMany();

        await posts.forEachAsync(async (post) => {
            if (post.marksCount) {
                post.commentsCount = await this.commentRepo.countBy({
                    mark: { postId: post.id },
                });
            } else {
                post.commentsCount = 0;
            }
        });

        return {
            post: posts.map((post) => ({
                id: String(post.id),
                name: '',
                image: post.images
                    .sort((a, b) => a.order - b.order)
                    .map((e) => ({
                        id: String(e.order),
                        url: getFilePath(e.url),
                    })),
                video: post.video ? { url: getFilePath(post.video.url) } : undefined,
                described: post.description || '',
                created: post.createdAt,
                feel: String(post.feelsCount),
                comment_mark: String(post.marksCount + post.commentsCount),
                is_felt: post.feelOfUser ? String(post.feelOfUser.type) : '-1',
                is_blocked: '0',
                can_edit: getCanEdit(post, user),
                banned: getBanned(post),
                state: post.status || '',
                author: {
                    id: String(post.author.id),
                    name: post.author.username || '',
                    avatar: getFilePath(post.author.avatar),
                },
            })),
        };
    }

    async setViewedPost(user: User, { id }: SetViewedPost) {
        let postView = await this.postViewRepo.findOneBy({ postId: id, userId: user.id });
        if (!postView) {
            postView = new PostView({ userId: user.id, postId: id, count: 0 });
        }
        postView.count += 1;
        await this.postViewRepo.save(postView);
        return {
            viewed: String(postView.count),
        };
    }
}
