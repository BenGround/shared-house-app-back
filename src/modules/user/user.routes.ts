import { Application, Router } from 'express';
import { checkSession, createPassword, findByUsername, login, logout, register, sendEmail } from './user.controller';

export default (app: Application): void => {
  const router = Router();

  router.post('/register', register);
  router.post('/login', login);
  router.post('/logout', logout);
  router.get('/:username', findByUsername);

  app.use('/user', router);
  app.get('/session-status', checkSession);
  app.get('/send-emails', sendEmail);
  app.post('/create-password', createPassword);
};
