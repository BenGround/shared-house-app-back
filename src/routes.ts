import { Application } from 'express';
import user from './modules/user/user.routes';
import sharedSpace from './modules/sharedSpace/sharedspace.routes';
import booking from './modules/booking/booking.routes';

export default (app: Application): void => {
  user(app);
  sharedSpace(app);
  booking(app);
};
