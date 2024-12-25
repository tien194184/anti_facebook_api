import { HttpException, HttpExceptionOptions } from '@nestjs/common';
import { errorMessages } from '../constants/error-messages.constants';

export class AppException extends HttpException {
    constructor(code = 9999, status = 400, error?: any, options?: HttpExceptionOptions) {
        super(
            {
                code: String(code),
                message: errorMessages[code] || 'Exception',
                error,
            },
            status,
            options,
        );
    }
}
