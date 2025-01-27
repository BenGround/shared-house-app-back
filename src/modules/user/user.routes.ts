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
} from './user.controller';

export default (app: Application): void => {
  const router = Router();

  router.post('/register', register);
  router.put('/update', update);
  router.put('/update/picture', uploadProfilePicture, updatePicture);
  router.post('/login', login);
  router.post('/logout', logout);
  router.get('/:username', findByUsername);

  app.use('/user', router);
  app.get('/session-status', checkSession);
  app.get('/send-emails', sendEmail);
  app.post('/create-password', createPassword);
};
