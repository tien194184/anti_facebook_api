import { Post } from '../../../database/entities/post.entity';
import { User } from '../../../database/entities/user.entity';

export class NotifyEditPostDto {
    post: Post;
    author: User;
}
