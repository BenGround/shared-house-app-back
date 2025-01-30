import { Application, Router } from 'express';
import {
  checkSession,
  createPassword,
  findByUsername,
  login,
  logout,
  register,
  update,
  deletePicture,
  adminGetUsers,
  adminUpdateUser,
  adminSendPasswordEmail,
  adminCreateUser,
  adminDeleteUser,
  uploadImage,
  uploadProfilePicture,
} from './user.controller';
import checkUserConnection from '../../middlewares/checkUserConnection';
import checkAdmin from '../../middlewares/checkAdmin';

export default (app: Application): void => {
  const userRouter = Router();
  userRouter.post('/register', register);
  userRouter.put('/update', checkUserConnection, update);
  userRouter.put('/update/picture', checkUserConnection, uploadProfilePicture, uploadImage);
  userRouter.put('/delete/picture', checkUserConnection, deletePicture);
  userRouter.post('/logout', checkUserConnection, logout);
  userRouter.get('/:username', checkUserConnection, findByUsername);
  userRouter.post('/login', login);

  app.use('/user', userRouter);

  const adminRouter = Router();
  adminRouter.use(checkUserConnection, checkAdmin);
  adminRouter.get('/getUsers', adminGetUsers);
  adminRouter.put('/user', adminUpdateUser);
  adminRouter.get('/sendPasswordEmail/:id', adminSendPasswordEmail);
  adminRouter.post('/user', adminCreateUser);
  adminRouter.delete('/user', adminDeleteUser);

  app.use('/admin', adminRouter);

  app.get('/session-status', checkUserConnection, checkSession);
  app.post('/create-password', createPassword);
};
