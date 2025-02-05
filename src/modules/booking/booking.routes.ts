import { Application, Router } from 'express';
import {
  create,
  findAllBySharePlaceId,
  deleteBooking,
  getNumberBookingsByUser,
  update,
  findUserBookings,
} from './booking.controller';
import checkUserConnection from '../../middlewares/checkUserConnection';

export default (app: Application): void => {
  const router = Router();

  router.use(checkUserConnection);
  router.get('/user', findUserBookings);
  router.get('/:id', findAllBySharePlaceId);
  router.post('/create', create);
  router.put('/update', update);
  router.delete('/:id', deleteBooking);
  router.get('/number/:id', getNumberBookingsByUser);

  app.use('/bookings', router);
};
