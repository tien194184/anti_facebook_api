import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { BaseEntity } from './base.entity';

@Entity('friend_requests')
export class FriendRequest extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    targetId: number;

    @Column({ type: 'int' })
    userId: number;

    @Column({ type: 'boolean', default: false })
    read: boolean;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.friendRequested, { onDelete: 'CASCADE' })
    target: User;

    @ManyToOne(() => User, (user) => user.friendRequesting, { onDelete: 'CASCADE' })
    user: User;

    constructor(props: Partial<FriendRequest>) {
        super();
        Object.assign(this, props);
    }
}
