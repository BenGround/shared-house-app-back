import { Application, Router } from 'express';
import {
  checkSession,
  createPassword,
  login,
  logout,
  update,
  deletePicture,
  uploadImage,
  uploadProfilePicture,
} from './user.controller';
import checkUserConnection from '../../middlewares/checkUserConnection';
import checkAdmin from '../../middlewares/checkAdmin';
import {
  adminCreateUser,
  adminDeleteUser,
  adminGetUsers,
  adminSendPasswordEmail,
  adminUpdateUser,
} from './user.admin.controller';

export default (app: Application): void => {
  app.post('/user/login', login);
  app.get('/user/session-status', checkSession);
  app.post('/user/create-password', createPassword);
  app.post('/user/logout', logout);

  const userRouter = Router();
  userRouter.use(checkUserConnection);
  userRouter.put('/update', update);
  userRouter.put('/update/picture', uploadProfilePicture, uploadImage);
  userRouter.put('/delete/picture', deletePicture);

  app.use('/user', userRouter);

  const adminRouter = Router();
  adminRouter.use(checkUserConnection, checkAdmin);
  adminRouter.get('/getUsers', adminGetUsers);
  adminRouter.put('/user', adminUpdateUser);
  adminRouter.get('/sendPasswordEmail/:id', adminSendPasswordEmail);
  adminRouter.post('/user', adminCreateUser);
  adminRouter.delete('/user', adminDeleteUser);

  app.use('/admin', adminRouter);
};
