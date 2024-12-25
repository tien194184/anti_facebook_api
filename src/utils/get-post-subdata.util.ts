import { AccountStatus } from '../constants/account-status.enum';
import { CategoryType } from '../constants/category-types.enum';
import { costs } from '../constants/costs.constant';
import { Post } from '../database/entities/post.entity';
import { User } from '../database/entities/user.entity';

export const getCategory = (post: Post) => {
    if (post.video) {
        return { id: String(CategoryType.Videos), has_name: '2', name: 'videos' };
    } else if (post.images.length) {
        return { id: String(CategoryType.Posts), has_name: '0', name: 'home' };
    } else {
        return { id: String(CategoryType.Posts), has_name: '0', name: 'home' };
    }
};

export const getIsBlocked = (post: Post): boolean => {
    return Boolean(post.author.blocked.length || post.author.blocking.length);
};

export const getCanEdit = (post: Post, user: User) => {
    if (post.author.id === user.id && post.author.status !== AccountStatus.Inactive && user.coins >= costs.editPost) {
        return '1';
    } else {
        return '0';
    }
};

export const getBanned = (post: Post) => {
    return post.author.status === AccountStatus.Banned ? '1' : '0';
};

export const getCanMark = (post: Post, user: User) => {
    if (post.author.id !== user.id) {
        if (post.author.status === AccountStatus.Inactive) {
            return '-2';
        }
        if (user.coins < costs.createMark) {
            return '-4';
        }
        if (post.markOfUser) {
            if (post.markOfUser.editable) {
                return '2';
            } else {
                return '0';
            }
        } else {
            return '1';
        }
    } else {
        return '-1';
    }
};

export const getCanRate = (post: Post, user: User) => {
    if (post.author.id !== user.id) {
        if (post.author.status === AccountStatus.Inactive) {
            return '-2';
        }
        if (user.coins < costs.createFeel) {
            return '-4';
        }
        if (post.feelOfUser) {
            if (post.feelOfUser.editable) {
                return '2';
            } else {
                return '0';
            }
        } else {
            return '1';
        }
    } else {
        return '-1';
    }
};
