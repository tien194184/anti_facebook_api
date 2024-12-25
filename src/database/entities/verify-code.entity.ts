import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { VerifyCodeStatus } from '../../constants/verify-code-status.enum';
import { BaseEntity } from './base.entity';

@Entity('verify_codes')
export class VerifyCode extends BaseEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    userId: number;

    @Column({ type: 'varchar' })
    code: string;

    @Column({ type: 'timestamptz' })
    expiredAt: Date;

    @Column({ type: 'int2', default: VerifyCodeStatus.Active })
    status: VerifyCodeStatus;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    constructor(props: Partial<VerifyCode>) {
        super();
        Object.assign(this, props);
    }
}
