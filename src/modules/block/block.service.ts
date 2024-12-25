import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Block } from '../../database/entities/block.entity';
import { User } from '../../database/entities/user.entity';
import { GetListBlocks } from './dto/get-list-blocks.dto';
import { SetBlockDto } from './dto/set-block.dto';
import { Friend } from '../../database/entities/friend.entity';
import { AuthService } from '../../auth/auth.service';
import { UnblockDto } from './dto/unblock.dto';
import { AppException } from '../../exceptions/app.exception';
import { getFilePath } from '../../utils/get-file-path.util';
import { FriendRequest } from '../../database/entities/friend-request.entity';

@Injectable()
export class BlockService {
    constructor(
        @InjectRepository(Block)
        private blockRepo: Repository<Block>,
        @InjectRepository(Friend)
        private friendRepo: Repository<Friend>,
        @InjectRepository(FriendRequest)
        private friendRequestRepo: Repository<FriendRequest>,
        private authService: AuthService,
    ) {}

    async getListBlocks(user: User, { index = 0, count = 5 }: GetListBlocks) {
        const blocks = await this.blockRepo
            .createQueryBuilder('block')
            .innerJoinAndSelect('block.target', 'target')
            .where({ userId: user.id })
            .orderBy({ 'block.id': 'ASC' })
            .skip(index)
            .take(count)
            .getMany();

        return blocks.map((block) => ({
            id: String(block.target.id),
            name: block.target.username || '',
            avatar: getFilePath(block.target.avatar),
        }));
    }

    async setBlock(user: User, { user_id }: SetBlockDto) {
        if (user_id === user.id) {
            throw new AppException(3002);
        }
        await this.authService.getUserById(user_id);
        if (await this.isBlock(user.id, user_id)) {
            throw new AppException(3001);
        }

        const newBlock = new Block({
            targetId: user_id,
            userId: user.id,
        });
        await this.blockRepo.save(newBlock);

        await Promise.all([
            this.friendRepo.delete({ userId: user.id, targetId: user_id }),
            this.friendRepo.delete({ userId: user_id, targetId: user.id }),
            this.friendRequestRepo.delete({ userId: user.id, targetId: user_id }),
            this.friendRequestRepo.delete({ userId: user_id, targetId: user.id }),
        ]);

        return {};
    }

    async isBlock(userId: number, targetId: number) {
        const block = await this.blockRepo.findOneBy([
            { userId, targetId },
            { userId: targetId, targetId: userId },
        ]);

        return Boolean(block);
    }

    async unblock(user: User, { user_id }: UnblockDto) {
        await this.blockRepo.delete({
            targetId: user_id,
            userId: user.id,
        });

        return {};
    }
}
