import { Request, Response, NextFunction } from 'express';

const checkAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user.isAdmin) {
    res.status(401).send({
      errorCode: 'not.admin',
      message: 'You are not admin!',
    });
    return;
  }

  next();
};

export default checkAdmin;
