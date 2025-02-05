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

declare module 'sib-api-v3-sdk' {
  export interface ApiClient {
    authentications: {
      [key: string]: {
        apiKey: string;
      };
    };
  }

  export class TransactionalEmailsApi {}

  export const ApiClient: ApiClient;
  export const TransactionalEmailsApi: TransactionalEmailsApi;
}
