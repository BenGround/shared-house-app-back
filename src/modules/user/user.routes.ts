import { Application, Router } from 'express';
import { checkSession, findByUsername, login, logout, register } from './user.controller';

export default (app: Application): void => {
  const router = Router();

  router.post('/register', register);
  router.post('/login', login);
  router.post('/logout', logout);
  router.get('/:username', findByUsername);

  app.use('/user', router);
  app.get('/session-status', checkSession);
};
