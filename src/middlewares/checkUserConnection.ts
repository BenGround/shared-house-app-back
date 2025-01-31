import { Request, Response, NextFunction } from 'express';

const checkUserConnection = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.session.user) {
    res.status(401).json({ errorCode: 'user-not-logged', message: 'User is not authenticated' });
    return;
  }

  req.user = req.session.user;

  next();
};

export default checkUserConnection;
