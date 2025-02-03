import { Response } from 'express';

export const sendErrorResponse = (res: Response, status: number, errorCode: string, message?: string): void => {
  res.status(status).send({ errorCode, message });
};
