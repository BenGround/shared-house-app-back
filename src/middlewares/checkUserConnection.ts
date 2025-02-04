import { Response, NextFunction } from 'express';
import { sendErrorResponse } from '../utils/errorUtils';
import { checkingSession } from '../modules/user/user.helper';
import { ApiResponse } from '../types/responses.type';
import { AuthenticatedRequest } from '../types/requests.type';

const checkUserConnection = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>,
  next: NextFunction,
): Promise<void> => {
  const error = await checkingSession(req);

  if (error) {
    return sendErrorResponse(res, error.status, error.code, error.message);
  }

  req.user = req.session.user.dataValues;
  next();
};

export default checkUserConnection;
