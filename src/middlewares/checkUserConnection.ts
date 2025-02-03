import { Request, Response, NextFunction } from 'express';
import { User } from '../modules/user/user.model';
import { sendErrorResponse } from '../utils/errorUtils';
import { checkingSession } from '../modules/user/user.helper';

interface AuthenticatedRequest extends Request {
  user?: User;
}

const checkUserConnection = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const error = await checkingSession(req);

  if (error) {
    return sendErrorResponse(res, error.status, error.code, error.message);
  }

  req.user = req.session.user.dataValues;
  next();
};

export default checkUserConnection;
