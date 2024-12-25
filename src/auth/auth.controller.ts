import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { User } from '../database/entities/user.entity';
import { ApiTags } from '@nestjs/swagger';
import { GetVerifyCodeDto } from './dto/get-verify-code.dto';
import { CheckVerifyCodeDto } from './dto/check-verify-code.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthUser } from './decorators/user.decorator';
import { Auth } from './decorators/auth.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CheckEmailDto } from './dto/check-email.dto';
import { RestoreUserDto } from './dto/restore-user.dto';

@Controller('/')
@ApiTags('Auth')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('/signup')
    async signup(@Body() body: SignupDto) {
        return this.authService.signup(body);
    }

    @Post('/login')
    @HttpCode(200)
    async login(@Body() body: LoginDto) {
        return this.authService.login(body);
    }

    @Post('/change_password')
    @HttpCode(200)
    @Auth()
    async changePassword(@AuthUser() user: User, @Body() body: ChangePasswordDto) {
        return this.authService.changePassword(user, body);
    }

    @Post('/logout')
    @HttpCode(200)
    @Auth()
    async logout(@AuthUser() user: User) {
        return this.authService.logout(user);
    }

    @Post('/get_verify_code')
    @HttpCode(200)
    async getVerifyCode(@Body() query: GetVerifyCodeDto) {
        return this.authService.getVerifyCode(query.email);
    }

    @Post('/check_verify_code')
    @HttpCode(200)
    async checkVerifyCode(@Body() { email, code_verify: code }: CheckVerifyCodeDto) {
        return this.authService.checkVerifyCode(email, code);
    }

    @Post('/reset_password')
    @HttpCode(200)
    async resetPassword(@Body() { email, code, password }: ResetPasswordDto) {
        return this.authService.resetPassword(email, code, password);
    }

    @Post('/check_email')
    @HttpCode(200)
    async checkEmail(@Body() { email }: CheckEmailDto) {
        return this.authService.checkEmail(email);
    }

    @Post('/deactive_user')
    @HttpCode(200)
    @Auth()
    async deactivateUser(@AuthUser() user: User) {
        return this.authService.deactivateUser(user);
    }

    @Post('/restore_user')
    @HttpCode(200)
    async restoreUser(@Body() { email, code_verify }: RestoreUserDto) {
        return this.authService.restoreUser(email, code_verify);
    }
}
