import { Application, Router } from 'express';
import { create, findAllBySharePlaceId, deleteBooking, getNumberBookingsByUser, update } from './booking.controller';
import checkUserConnection from '../../middlewares/checkUserConnection';

export default (app: Application): void => {
  const router = Router();

  router.get('/:id', findAllBySharePlaceId);

  router.post('/create', checkUserConnection, create);
  router.put('/update', checkUserConnection, update);
  router.delete('/:id', checkUserConnection, deleteBooking);
  router.get('/number/:id', checkUserConnection, getNumberBookingsByUser);

  app.use('/bookings', router);
};
