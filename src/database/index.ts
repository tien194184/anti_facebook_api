import { Block } from './entities/block.entity';
import { Category } from './entities/category.entity';
import { Comment } from './entities/comment.entity';
import { DevToken } from './entities/dev-token.entity';
import { Feel } from './entities/feel.entity';
import { FriendRequest } from './entities/friend-request.entity';
import { Friend } from './entities/friend.entity';
import { Mark } from './entities/mark.entity';
import { Notification } from './entities/notification.entity';
import { PasswordHistory } from './entities/password-history.entity';
import { PostHistory } from './entities/post-history.entity';
import { PostImage } from './entities/post-image.entity';
import { PostVideo } from './entities/post-video.entity';
import { PostView } from './entities/post-view.entity';
import { Post } from './entities/post.entity';
import { PushSettings } from './entities/push-settings.entity';
import { Report } from './entities/report.entity';
import { Search } from './entities/search.entity';
import { UserInfo } from './entities/user-info.entity';
import { User } from './entities/user.entity';
import { VerifyCode } from './entities/verify-code.entity';

export const entities = [
    User,
    UserInfo,
    PasswordHistory,
    VerifyCode,
    Category,
    Post,
    PostHistory,
    PostImage,
    PostVideo,
    PostView,
    Mark,
    Comment,
    Feel,
    Report,
    Friend,
    FriendRequest,
    Block,
    Search,
    DevToken,
    PushSettings,
    Notification,
];
