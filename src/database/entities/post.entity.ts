import {
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    ManyToOne,
    OneToMany,
    OneToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { PostImage } from './post-image.entity';
import { PostVideo } from './post-video.entity';
import { Mark } from './mark.entity';
import { Feel } from './feel.entity';
import { Report } from './report.entity';
import { PostHistory } from './post-history.entity';
import { BaseEntity } from './base.entity';
import { PostView } from './post-view.entity';
import { MarkType } from '../../constants/mark-type.enum';

@Entity('posts')
export class Post extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    authorId: number;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'varchar', nullable: true })
    status: string | null;

    @Column({ type: 'int', default: 0 })
    edited: number;

    @Column({ type: 'int', nullable: true })
    categoryId: number | null;

    @Column({ type: 'int2', nullable: true })
    rate: MarkType;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamptz' })
    deletedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    author: User;

    @ManyToOne(() => Category, (category) => category.posts, { onDelete: 'SET NULL' })
    category: Category;

    @OneToMany(() => PostImage, (image) => image.post, { cascade: true })
    images: PostImage[];

    @OneToOne(() => PostVideo, (video) => video.post, { cascade: true })
    video: PostVideo | null;

    @OneToMany(() => Feel, (feel) => feel.post)
    feels: Feel[];
    feelsCount: number;
    kudosCount: number;
    disappointedCount: number;
    feelOfUser: Feel;

    @OneToMany(() => Mark, (mark) => mark.post, { cascade: true })
    marks: Mark[];
    marksCount: number;
    commentsCount: number;
    trustCount: number;
    fakeCount: number;
    markOfUser: Mark;

    @OneToMany(() => Report, (report) => report.post)
    reports: Report[];

    @OneToMany(() => PostHistory, (history) => history.post, { cascade: true })
    histories: PostHistory[];

    @OneToMany(() => PostView, (view) => view.post)
    views: PostView[];
    view: PostView;
    viewsCount: number;

    constructor(props: Partial<Post>) {
        super();
        Object.assign(this, props);
    }
}
