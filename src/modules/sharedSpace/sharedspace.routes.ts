import { Application, Router } from 'express';
import { create, destroy, findById, list } from './sharedSpace.controller';

export default (app: Application): void => {
  const router = Router();

  router.post('/create', create);
  router.get('/list', list);
  router.get('/:id', findById);
  router.delete('/:id', destroy);

  app.use('/sharedspace', router);
};
