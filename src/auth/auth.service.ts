import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, MoreThan, Repository } from 'typeorm';
import { compare, hash } from 'bcryptjs';
import { AccountStatus } from '../constants/account-status.enum';
import { User } from '../database/entities/user.entity';
import { AppException } from '../exceptions/app.exception';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { jwtSignOptions } from '../constants/jst-sign-options.constant';
import { generateVerifyCode } from '../utils/generate-verify-code.util';
import { MailerService } from '@nestjs-modules/mailer';
import { VerifyCode } from '../database/entities/verify-code.entity';
import { VerifyCodeStatus } from '../constants/verify-code-status.enum';
import dayjs from '../utils/dayjs.util';
import { ChangePasswordDto } from './dto/change-password.dto';
import { DevToken } from '../database/entities/dev-token.entity';
import { getFilePath } from '../utils/get-file-path.util';
import { PasswordHistory } from '../database/entities/password-history.entity';

@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private mailerService: MailerService,
        @InjectEntityManager()
        private entityManager: EntityManager,
        @InjectRepository(User)
        private userRepo: Repository<User>,
        @InjectRepository(VerifyCode)
        private verifyCodeRepo: Repository<VerifyCode>,
        @InjectRepository(DevToken)
        private devTokenRepo: Repository<DevToken>,
        @InjectRepository(PasswordHistory)
        private passwordHistoryRepo: Repository<PasswordHistory>,
    ) {}

    async hashPassword(password: string) {
        return hash(password, 10);
    }

    async comparePassword(user: User, password: string) {
        return compare(password, user.password);
    }

    async doesEmailExist(email: string) {
        return this.userRepo.findOne({ where: { email }, withDeleted: true });
    }

    async signup({ email, password }: SignupDto) {
        if (await this.doesEmailExist(email)) {
            throw new AppException(9996);
        }

        if (password.indexOf(email) !== -1) {
            throw new AppException(9995);
        }

        const user = new User({
            email,
            password: await this.hashPassword(password),
            status: AccountStatus.Inactive,
            coins: 50,
            deletedAt: new Date(),
        });
        await this.userRepo.save(user);
        return this.getVerifyCode(email);
    }

    async login({ email, password, uuid: device_id }: LoginDto) {
        const user = await this.userRepo.findOne({
            where: { email },
            withDeleted: true,
        });

        if (!user || !(await this.comparePassword(user, password))) {
            throw new AppException(9991, 403);
        }

        user.token = this.jwtService.sign({ id: user.id, device_id }, jwtSignOptions);
        await this.userRepo.save(user);

        return {
            id: String(user.id),
            username: user.username || '',
            token: user.token,
            avatar: getFilePath(user.avatar),
            active: String(user.status),
            coins: String(user.coins),
        };
    }

    async checkOldPassword(user: User, password: string) {
        if (await compare(password, user.password)) {
            throw new AppException(9989);
        }
        const oldPasswords = await this.passwordHistoryRepo.findBy({ userId: user.id });
        for (const oldPassword of oldPasswords) {
            if (await compare(password, oldPassword.password)) {
                throw new AppException(9989);
            }
        }
    }

    async changePassword(user: User, { password, new_password }: ChangePasswordDto) {
        if (!(await this.comparePassword(user, password))) {
            throw new AppException(9990);
        }

        if (password.indexOf(user.email) !== -1) {
            throw new AppException(9995);
        }

        await this.checkOldPassword(user, new_password);

        const oldPassword = new PasswordHistory({ user, password: user.password });
        user.password = await this.hashPassword(new_password);
        user.token = this.jwtService.sign({ id: user.id, device_id: generateVerifyCode(6) }, jwtSignOptions);
        await this.entityManager.transaction(async (manager) => {
            const userRepo = manager.getRepository(User);
            const passwordHistoryRepo = manager.getRepository(PasswordHistory);

            await passwordHistoryRepo.save(oldPassword);
            await userRepo.save(user);
        });

        return {
            token: user.token,
        };
    }

    async logout(user: User) {
        user.token = null;
        await this.userRepo.save(user);
        await this.devTokenRepo.delete({ userId: user.id });

        return {};
    }

    async getUserById(id: number, withDeleted = false) {
        const user = await this.userRepo.findOne({
            where: {
                id,
            },
            withDeleted,
        });

        if (!user) {
            throw new AppException(9995);
        }

        return user;
    }

    async getVerifyCode(email: string) {
        const user = await this.userRepo.findOne({
            where: { email },
            withDeleted: true,
        });
        if (!user) {
            throw new AppException(9995);
        }
        const code = generateVerifyCode(6);
        const verifyCode = new VerifyCode({
            user,
            code,
            expiredAt: dayjs().add(30, 'minutes').toDate(),
        });

        await this.verifyCodeRepo.update({ userId: user.id }, { status: VerifyCodeStatus.Inactive });
        await this.verifyCodeRepo.save(verifyCode);
        await this.mailerService.sendMail({
            to: email,
            subject: 'Verify code',
            text: `This is your verify code ${code} `,
        });

        return {
            verify_code: String(code),
        };
    }

    async verifyCode(email: string, code: string) {
        const verifyCode = await this.verifyCodeRepo.findOne({
            where: {
                status: VerifyCodeStatus.Active,
                user: {
                    email,
                },
                code,
                expiredAt: MoreThan(new Date()),
            },
            withDeleted: true,
            relations: ['user'],
        });
        if (!verifyCode) {
            throw new AppException(9993);
        }

        verifyCode.status = VerifyCodeStatus.Inactive;
        return this.verifyCodeRepo.save(verifyCode);
    }

    async checkVerifyCode(email: string, code: string) {
        const verifyCode = await this.verifyCode(email, code);

        const user = verifyCode.user;
        if (user.status === AccountStatus.Inactive) {
            user.status = user.username ? AccountStatus.Active : AccountStatus.Pending;
            await this.userRepo.save(user);
        }

        return {
            id: String(user.id),
            active: String(user.status),
        };
    }

    async resetPassword(email: string, code: string, password: string) {
        const user = await this.userRepo.findOneBy({ email });
        if (!user) {
            throw new AppException(9995);
        }
        await this.checkOldPassword(user, password);

        await this.verifyCode(email, code);

        const oldPassword = new PasswordHistory({ user, password: user.password });
        user.password = await this.hashPassword(password);
        user.token = null;

        await this.entityManager.transaction(async (manager) => {
            const userRepo = manager.getRepository(User);
            const passwordHistoryRepo = manager.getRepository(PasswordHistory);

            await passwordHistoryRepo.save(oldPassword);
            await userRepo.save(user);
        });

        return {};
    }

    async checkEmail(email: string) {
        const user = await this.doesEmailExist(email);

        return {
            existed: user ? '1' : '0',
        };
    }

    async deactivateUser(user: User) {
        user.status = AccountStatus.Deactivated;
        user.deletedAt = new Date();

        await this.userRepo.save(user);

        return {};
    }

    async restoreUser(email: string, code: string) {
        const { user } = await this.verifyCode(email, code);
        if (user.status !== AccountStatus.Deactivated) {
            throw new AppException(9995);
        }

        if (user.username) {
            user.status = AccountStatus.Active;
            user.deletedAt = null;
        } else {
            user.status = AccountStatus.Pending;
            user.deletedAt = new Date();
        }
        await this.userRepo.save(user);

        return {
            id: String(user.id),
            active: String(user.status),
        };
    }
}
