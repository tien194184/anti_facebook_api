import { Module } from '@nestjs/common';

import { options } from './database/orm.config';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { extname, join } from 'path';
import { entities } from './database';
import { ProfileController, ProfileWithDeletedController } from './modules/profile/profile.controller';
import { AuthController } from './auth/auth.controller';
import { ProfileService } from './modules/profile/profile.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { PostController } from './modules/post/post.controller';
import { PostService } from './modules/post/post.service';
import { FriendController } from './modules/friend/friend.controller';
import { FriendService } from './modules/friend/friend.service';
import { BlockController } from './modules/block/block.controller';
import { BlockService } from './modules/block/block.service';
import { SettingsController } from './modules/settings/settings.controller';
import { SettingsService } from './modules/settings/settings.service';
import { SearchController } from './modules/search/search.controller';
import { SearchService } from './modules/search/search.service';
import { CommentController } from './modules/comment/comment.controller';
import { CommentService } from './modules/comment/comment.service';
import { NotificationController } from './modules/notification/notification.controller';
import { NotificationService } from './modules/notification/notification.service';
import { AdminController } from './modules/admin/admin.controller';
import { AdminService } from './modules/admin/admin.service';

@Module({
    imports: [
        AuthModule,
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'uploads'),
            serveRoot: '/files',
        }),
        ConfigModule.forRoot(),
        TypeOrmModule.forRoot(options),
        TypeOrmModule.forFeature(entities),
        MulterModule.register({
            storage: diskStorage({
                destination: (req, file, cb) => {
                    cb(null, 'uploads/');
                },
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
                },
            }),
        }),
    ],
    controllers: [
        AuthController,
        ProfileWithDeletedController,
        ProfileController,
        PostController,
        SearchController,
        FriendController,
        BlockController,
        SettingsController,
        CommentController,
        NotificationController,
        AdminController,
    ],
    providers: [
        ProfileService,
        PostService,
        SearchService,
        FriendService,
        BlockService,
        SettingsService,
        CommentService,
        NotificationService,
        AdminService,
    ],
})
export class AppModule {}
