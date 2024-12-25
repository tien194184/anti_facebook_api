import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Post } from './post.entity';

@Entity('post_views')
@Index(['userId', 'postId'], { unique: true })
export class PostView extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'userId', type: 'int' })
    userId: number;

    @Column({ name: 'postId', type: 'int' })
    postId: number;

    @Column({ name: 'count', type: 'int', default: 0 })
    count: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Post, (post) => post.views, { onDelete: 'CASCADE' })
    post: Post;

    constructor(props: Partial<PostView>) {
        super();
        Object.assign(this, props);
    }
}
