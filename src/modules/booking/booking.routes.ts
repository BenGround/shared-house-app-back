import { Application, Router } from 'express';
import { create, findAllBySharePlaceId, deleteBooking, getNumberBookingsByUser } from './booking.controller';

export default (app: Application): void => {
  const router = Router();

  router.post('/create', create);
  router.get('/:id', findAllBySharePlaceId);
  router.get('/number/:id', getNumberBookingsByUser);
  router.delete('/:id', deleteBooking);

  app.use('/bookings', router);
};
