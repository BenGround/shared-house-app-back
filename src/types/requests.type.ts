import { User } from '../modules/user/user.model';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: User;
}
