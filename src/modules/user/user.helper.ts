import { Response } from 'express';
import { User } from './user.model';
import crypto from 'crypto';
import { getUrlImg } from './../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import { getMinioClient } from '../../utils/minioClient';

export const frontUserInfo = (user: User, forAdmin: boolean = false) => {
  const userInfos: Record<string, any> = {
    username: user.username || null,
    roomNumber: user.roomNumber,
    email: user.email,
    profilePicture: user.profilePicture ? getUrlImg(user.profilePicture) : null,
    isAdmin: Boolean(user.isAdmin),
    ...(forAdmin && { isSet: user.isSet, id: user.id }), // Adding admin-specific fields
  };

  return userInfos;
};

export const generateResetToken = (): string => {
  return crypto.randomBytes(20).toString('hex');
};

export const validateRequiredFields = (fields: string[], body: Record<string, any>, res: Response): boolean => {
  for (const field of fields) {
    if (!body[field]) {
      sendErrorResponse(res, 400, 'data.missing', `Missing ${field} param!`);
      return false;
    }
  }
  return true;
};
