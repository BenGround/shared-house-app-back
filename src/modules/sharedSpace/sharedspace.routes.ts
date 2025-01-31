import { Application, Router } from 'express';
import {
  adminCreateSharedspace,
  adminDeleteSharedspaces,
  adminUpdateSharedspace,
  findById,
  list,
} from './sharedSpace.controller';
import checkUserConnection from './../../middlewares/checkUserConnection';
import checkAdmin from './../../middlewares/checkAdmin';

export default (app: Application): void => {
  const router = Router();
  router.use(checkUserConnection);
  router.get('/list', list);
  router.get('/:id', findById);

  app.use('/sharedspace', router);

  const adminRouter = Router();
  adminRouter.use(checkUserConnection, checkAdmin);
  adminRouter.put('/sharedspace', adminUpdateSharedspace);
  adminRouter.post('/sharedspace', adminCreateSharedspace);
  adminRouter.delete('/sharedspace', adminDeleteSharedspaces);

  app.use('/admin', adminRouter);
};
