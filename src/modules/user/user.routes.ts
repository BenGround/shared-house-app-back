import { Application, Router } from 'express';
import {
  checkSession,
  createPassword,
  findByUsername,
  login,
  logout,
  register,
  update,
  updatePicture,
  sendEmail,
  uploadProfilePicture,
  deletePicture,
} from './user.controller';
import checkUserConnection from '../../middlewares/checkUserConnection';

export default (app: Application): void => {
  const router = Router();

  router.post('/register', register);
  router.put('/update', checkUserConnection, update);
  router.put('/update/picture', checkUserConnection, uploadProfilePicture, updatePicture);
  router.put('/delete/picture', checkUserConnection, deletePicture);
  router.post('/logout', checkUserConnection, logout);
  router.get('/:username', checkUserConnection, findByUsername);
  router.post('/login', login);

  app.use('/user', router);
  app.get('/session-status', checkUserConnection, checkSession);
  app.get('/send-emails', sendEmail);
  app.post('/create-password', createPassword);
};
