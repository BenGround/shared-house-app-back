import { Request, Response } from 'express';
import { User } from './user.model';
import crypto from 'crypto';
import { getUrlImg } from './../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import { UserSession } from '../../types/session.type';
import { FrontUser } from '../../types/responses.type';

export const frontUserInfo = (user: User, forAdmin: boolean = false) => {
  const userInfos: FrontUser = {
    username: user.username ?? '',
    roomNumber: user.roomNumber,
    email: user.email ?? '',
    profilePicture: getUrlImg(user.profilePicture),
    isAdmin: Boolean(user.isAdmin),
    ...(forAdmin && { isActive: user.isActive, id: user.id }),
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
  code: string;
  message: string;
} | null> => {
  if (!req.session?.user) {
    return { status: 400, code: 'user.not.logged', message: 'User is not authenticated' };
  }

  try {
    const userInDatabase = await User.findByPk(req.session?.user?.id);

    if (!userInDatabase) {
      await destroySession(req);
      return { status: 400, code: 'user.not.found', message: 'Room number not found' };
    }

    if (!userInDatabase.dataValues.isActive) {
      await destroySession(req);
      return { status: 400, code: 'user.not.active', message: 'User not activated' };
    }

    (req.session as UserSession).user = userInDatabase;

    return null;
  } catch (error) {
    await destroySession(req);
    return { status: 500, code: 'user.not.found', message: 'Error retrieving user' };
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
