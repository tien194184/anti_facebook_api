import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('password_history')
export class PasswordHistory extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int4' })
    userId: number;

    @Column({ type: 'varchar' })
    password: string;

    @UpdateDateColumn()
    updatedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, {
        onDelete: 'CASCADE',
        orphanedRowAction: 'delete',
    })
    user: User;

    constructor(props: Partial<PasswordHistory>) {
        super();
        Object.assign(this, props);
    }
}
