import { User } from '../src/modules/user/user.model';
import { Session } from 'express-session';
import { Request } from 'express';

declare module 'express-session' {
  interface Session {
    user?: User;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
