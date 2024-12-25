import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserGuard } from '../guards/user.guard';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserWithDeletedGuard } from '../guards/user-with-deleted.guard';

interface AuthOptions {
    withDeleted: boolean;
}

export function Auth(options: Partial<AuthOptions> = {}) {
    return applyDecorators(
        UseGuards(options.withDeleted ? UserWithDeletedGuard : UserGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({
            content: {
                json: {
                    example: {
                        code: '9998',
                        message: 'Token is invalid',
                    },
                },
            },
        }),
    );
}
