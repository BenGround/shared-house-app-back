import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/user/user.model';
import { sendErrorResponse } from '../utils/errorUtils';
import { ApiResponse } from '../types/responses.type';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const checkAdmin = (req: AuthenticatedRequest, res: Response<ApiResponse>, next: NextFunction): void => {
  if (!req.user || !req.user.isAdmin) {
    return sendErrorResponse(res, 403, 'not.admin', 'You are not an admin');
  }

  next();
};

export default checkAdmin;
