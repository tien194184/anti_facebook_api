import { NotificationType } from '../../../constants/notification-type.enum';
import { Feel } from '../../../database/entities/feel.entity';
import { Mark } from '../../../database/entities/mark.entity';
import { Post } from '../../../database/entities/post.entity';
import { User } from '../../../database/entities/user.entity';

export class CreateNotificationDto {
    type: NotificationType;
    userId?: number;
    targetId?: number;
    postId?: number;
    markId?: number;
    feelId?: number;
    user?: User | null;
    target?: User | null;
    post?: Post | null;
    mark?: Mark | null;
    feel?: Feel | null;
    coins?: number | null;
}
