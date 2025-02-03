import { Application, Router } from 'express';
import {
  adminCreateSharedspace,
  adminDeletePicture,
  adminDeleteSharedspaces,
  adminUpdateSharedspace,
  adminUploadImage,
  adminUploadPicture,
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
  adminRouter.put('/sharedspace/update/picture/:id', adminUploadPicture, adminUploadImage);
  adminRouter.put('/sharedspace/delete/picture/:id', adminDeletePicture);

  app.use('/admin', adminRouter);
};
