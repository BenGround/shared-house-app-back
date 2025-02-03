import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/user/user.model';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const checkAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.isAdmin) {
    res.status(403).json({
      errorCode: 'not.admin',
      message: 'You are not an admin!',
    });
    return;
  }

  next();
};

export default checkAdmin;
