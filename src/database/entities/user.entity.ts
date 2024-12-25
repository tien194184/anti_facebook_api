import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    OneToMany,
    DeleteDateColumn,
    OneToOne,
} from 'typeorm';
import { AccountStatus } from '../../constants/account-status.enum';
import { Block } from './block.entity';
import { Friend } from './friend.entity';
import { BaseEntity } from './base.entity';
import { FriendRequest } from './friend-request.entity';
import { PushSettings } from './push-settings.entity';
import { Role } from '../../constants/role.enum';

@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int2', default: Role.User })
    role: Role;

    @Index({ unique: true })
    @Column({ type: 'varchar' })
    email: string;

    @Column({ type: 'varchar' })
    password: string;

    @Column({ type: 'varchar', nullable: true })
    token: string | null;

    @Column({ type: 'int2', default: AccountStatus.Pending })
    status: AccountStatus;

    @Column({ type: 'varchar', nullable: true })
    username: string | null;

    @Column({ type: 'varchar', nullable: true })
    avatar: string | null;

    @Column({ type: 'int', default: 0 })
    coins: number;

    @Index({ unique: false })
    @CreateDateColumn({ type: 'timestamptz' })
    lastActive: Date;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz' })
    updatedAt: Date;

    @DeleteDateColumn({ type: 'timestamptz' })
    deletedAt: Date | null;

    @OneToMany(() => Block, (block) => block.target)
    blocked: Block[];

    @OneToMany(() => Block, (block) => block.user)
    blocking: Block[];

    @OneToMany(() => FriendRequest, (friendRequest) => friendRequest.target)
    friendRequested: FriendRequest[];

    @OneToMany(() => FriendRequest, (friendRequest) => friendRequest.user)
    friendRequesting: FriendRequest[];

    @OneToMany(() => Friend, (friend) => friend.user)
    friends: Friend[];
    friendsCount: number;

    @OneToOne(() => PushSettings, (settings) => settings.user, { cascade: true })
    pushSettings: PushSettings;

    constructor(props: Partial<User>) {
        super();
        Object.assign(this, props);
    }
}
