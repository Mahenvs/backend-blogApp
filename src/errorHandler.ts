// errorHandler.ts
import { Response } from 'express';

export const errorHandler = (res: Response, error: any,status:number) => {
    const err = error as { message?: string; detail?: string };

    const errorMessage = err?.message || 'An unexpected error occurred';
    const errorDetails = err?.detail || errorMessage;

    return res.status(400).json({
        status: status,
        error: 'Bad Request',
        message: 'The request could not be processed due to a constraint violation.',
        details: errorMessage
    });
}
