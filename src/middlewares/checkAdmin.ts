import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/user/user.model';
import { sendErrorResponse } from '../utils/errorUtils';
import { ApiResponse, USER_NOT_ADMIN } from '@benhart44/shared-house-shared';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const checkAdmin = (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): void => {
  if (!req.user || !req.user.isAdmin) {
    return sendErrorResponse(res, 403, USER_NOT_ADMIN, 'You are not an admin');
  }

  next();
};

export default checkAdmin;
