import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from '../../database/entities/post.entity';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { SearchDto } from './dto/search.dto';
import { Comment } from '../../database/entities/comment.entity';
import { Search } from '../../database/entities/search.entity';
import { GetSavedSearchDto } from './dto/get-saved-search.dto';
import { DeleteSavedSearchDto } from './dto/delete-saved-search.dto';
import { SearchUserDto } from './dto/search-user.dto';
import { getFilePath } from '../../utils/get-file-path.util';

@Injectable()
export class SearchService {
    constructor(
        @InjectRepository(Search)
        private searchRepo: Repository<Search>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(Post)
        private postRepo: Repository<Post>,
        @InjectRepository(Comment)
        private commentRepo: Repository<Comment>,
    ) {}

    async search(user: User, { keyword, user_id, index, count }: SearchDto) {
        const search = new Search({
            keyword,
            userId: user.id,
        });
        await this.searchRepo.save(search);

        keyword = keyword.trim().replace(/\s+/g, '|');
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
            .andWhere("ts_rank_cd(to_tsvector('vn', post.description), to_tsquery('vn', :keyword)) > 0", {
                keyword,
            })
            .addSelect("ts_rank_cd(to_tsvector('vn', post.description), to_tsquery('vn', :keyword))", 'rank')
            .orderBy({
                rank: 'DESC',
                'post.id': 'DESC',
            })
            .skip(index)
            .take(count);
        if (user_id) {
            query.andWhere({ authorId: user_id });
        }

        const posts = await query.getMany();

        for (const post of posts) {
            if (post.marksCount) {
                post.commentsCount = await this.commentRepo
                    .createQueryBuilder('comment')
                    .innerJoin('comment.mark', 'mark')
                    .where({ 'mark.postId': post.id })
                    .getCount();
            } else {
                post.commentsCount = 0;
            }
        }

        return posts.map((post) => ({
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
            mark_comment: String(post.marksCount + post.commentsCount),
            is_felt: post.feelOfUser ? '1' : '0',
            state: post.status || '',
            author: {
                id: String(post.author.id),
                name: post.author.username || '',
                avatar: getFilePath(post.author.avatar),
            },
        }));
    }

    async searchUser(user: User, { keyword, index, count }: SearchUserDto) {
        const search = new Search({
            keyword,
            userId: user.id,
        });
        await this.searchRepo.save(search);

        keyword = keyword.trim().replace(/\s+/g, '|');
        const query = this.userRepo
            .createQueryBuilder('user')
            .leftJoin('user.blocked', 'blocked', 'blocked.userId = :userId', { userId: user.id })
            .leftJoin('user.blocking', 'blocking', 'blocking.targetId = :targetId', { targetId: user.id })
            .loadRelationCountAndMap('user.friendsCount', 'user.friends', 'same_friend', (qb) =>
                qb
                    .innerJoin('same_friend.target', 'target')
                    .innerJoin('target.friends', 'friend', 'friend.targetId = :targetId', { targetId: user.id }),
            )
            .where('blocked.id IS NULL')
            .andWhere('blocking.id IS NULL')
            .andWhere("ts_rank_cd(to_tsvector('vn', user.username), to_tsquery('vn', :keyword)) > 0", {
                keyword,
            })
            .addSelect("ts_rank_cd(to_tsvector('vn', user.username), to_tsquery('vn', :keyword))", 'rank')
            .orderBy({ rank: 'DESC', 'user.lastActive': 'DESC', 'user.id': 'DESC' })
            .skip(index)
            .take(count);
        const users = await query.getMany();

        return users.map((user) => ({
            id: String(user.id),
            username: user.username || '',
            avatar: getFilePath(user.avatar),
            created: user.createdAt,
            same_friends: String(user.friendsCount),
        }));
    }

    async getSavedSearches(user: User, { index, count }: GetSavedSearchDto) {
        const searches = await this.searchRepo.find({
            where: { userId: user.id },
            skip: index,
            take: count,
            order: { id: 'DESC' },
        });

        return searches.map((search) => ({
            id: String(search.id),
            keyword: search.keyword,
            created: search.createdAt,
        }));
    }

    async deleteSavedSearch(user: User, { search_id, all }: DeleteSavedSearchDto) {
        if (all) {
            await this.searchRepo.delete({ userId: user.id });
        } else {
            await this.searchRepo.delete({ userId: user.id, id: search_id });
        }
        return {};
    }
}
