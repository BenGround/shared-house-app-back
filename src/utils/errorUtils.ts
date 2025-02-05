import { ErrorCode } from '@benhart44/shared-house-shared';
import { Response } from 'express';

export const sendErrorResponse = (res: Response, status: number, errorCode: ErrorCode, message?: string): void => {
  res.status(status).send({ errorCode, message });
};
