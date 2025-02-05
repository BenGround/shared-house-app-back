import { Request, Response } from 'express';
import { User } from './user.model';
import crypto from 'crypto';
import { getUrlImg } from './../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import { UserSession } from '../../types/session.type';
import {
  ErrorCode,
  FrontUser,
  USER_EMAIL_INVALID,
  USER_EMAIL_INVALID_LENGTH,
  USER_NAME_INVALID,
  USER_NOT_ACTIVE,
  USER_NOT_FOUND,
  USER_NOT_LOGGED,
  validateEmailFormat,
  validateEmailLength,
  validateUsername,
} from '@benhart44/shared-house-shared';

export const frontUserInfo = (user: User, forAdmin: boolean = false) => {
  const userInfos: FrontUser = {
    id: user.id,
    username: user.username ?? '',
    roomNumber: user.roomNumber,
    email: user.email ?? '',
    profilePicture: getUrlImg(user.profilePicture),
    isAdmin: Boolean(user.isAdmin),
    ...(forAdmin && { isActive: user.isActive }),
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

export const checkingSession = async (
  req: Request,
): Promise<{
  status: number;
  code: ErrorCode;
  message: string;
} | null> => {
  if (!req.session?.user) {
    return { status: 400, code: USER_NOT_LOGGED, message: 'User is not authenticated' };
  }

  try {
    const userInDatabase = await User.findByPk(req.session?.user?.id);

    if (!userInDatabase) {
      await destroySession(req);
      return { status: 400, code: USER_NOT_FOUND, message: 'Room number not found' };
    }

    if (!userInDatabase.dataValues.isActive) {
      await destroySession(req);
      return { status: 400, code: USER_NOT_ACTIVE, message: 'User not activated' };
    }

    (req.session as UserSession).user = userInDatabase;

    return null;
  } catch (error) {
    await destroySession(req);
    return { status: 500, code: USER_NOT_FOUND, message: 'Error retrieving user' };
  }
};

export const destroySession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(new Error('Error destroying session'));
      } else {
        resolve();
      }
    });
  });
};

export const checkRoomNumberExists = async (roomNumber: number): Promise<boolean> => {
  const foundUsers = await User.findAll({ where: { roomNumber } });
  return foundUsers.length > 0;
};

export const validateDataUser = (
  email: string,
  username: string,
): { status: number; code: ErrorCode; message: string } | null => {
  if (!validateEmailLength(email)) {
    return { status: 400, code: USER_EMAIL_INVALID_LENGTH, message: 'Email must be between 3 and 150 characters' };
  } else if (!validateEmailFormat(email)) {
    return { status: 400, code: USER_EMAIL_INVALID, message: 'Email is invalid' };
  }

  if (!validateUsername(username)) {
    return { status: 400, code: USER_NAME_INVALID, message: 'Username is invalid' };
  }

  return null;
};
