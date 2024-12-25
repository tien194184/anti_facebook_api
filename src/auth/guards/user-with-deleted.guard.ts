import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth.service';
import { AppException } from '../../exceptions/app.exception';
import { AccountStatus } from '../../constants/account-status.enum';

@Injectable()
export class UserWithDeletedGuard extends AuthGuard('jwt') {
    constructor(private authService: AuthService) {
        super();
    }

    async canActivate(context: ExecutionContext) {
        if (!(await super.canActivate(context))) {
            return false;
        }
        const req = context.switchToHttp().getRequest();
        const user = await this.authService.getUserById(req.user.id, true);
        const token = req.headers['authorization'].slice(7);
        if (user.status === AccountStatus.Inactive) {
            throw new AppException(9995);
        }
        if (user.token !== token) {
            throw new AppException(9998);
        }
        req.user = user;
        return true;
    }
}
