import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking } from './booking.model';
import { UserSession } from '../../types/session.type';
import moment from 'moment-timezone';
import { User } from '../user/user.model';
import { getUrlImg } from './../../utils/imageUtils';
import { io } from '../../index';
import { sendErrorResponse } from '../../utils/errorUtils';
import { adjustDate, createOrUpdateBooking, isValidDate } from './booking.helper';

export const create = (req: Request, res: Response) => createOrUpdateBooking(req, res, false);
export const update = (req: Request, res: Response) => createOrUpdateBooking(req, res, true);

export const findAllBySharePlaceId = (req: Request, res: Response): void => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  if (!id) {
    return sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');
  }

  if (!startDate || !endDate) {
    return sendErrorResponse(res, 400, 'data.missing', 'Both startDate and endDate query parameters are required!');
  }

  if (!isValidDate(startDate as string) || !isValidDate(endDate as string)) {
    return sendErrorResponse(
      res,
      400,
      'data.missing',
      'Invalid date format. Please use YYYY-MM-DD format for startDate and endDate.',
    );
  }

  Booking.findAll({
    where: {
      sharedSpaceId: id,
      startDate: {
        [Op.gte]: adjustDate(startDate as string, 'start'),
      },
      endDate: {
        [Op.lte]: adjustDate(endDate as string, 'end'),
      },
    },
    include: [
      {
        model: User,
        attributes: ['username', 'roomNumber', 'profilePicture'],
      },
    ],
  })
    .then((bookings: Booking[]) => {
      const formattedBookings = bookings.map((booking) => {
        const user = booking.getDataValue('user').dataValues;
        return {
          id: booking.id,
          username: user.username,
          roomNumber: user.roomNumber,
          picture: getUrlImg(user.profilePicture),
          startDate: moment.utc(booking.dataValues.startDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
          endDate: moment.utc(booking.dataValues.endDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        };
      });

      res.send(formattedBookings);
    })
    .catch(() => {
      sendErrorResponse(res, 500, 'booking', 'Error retrieving bookings');
    });
};

export const getNumberBookingsByUser = (req: Request, res: Response): void => {
  const { id } = req.params;

  if (!id) {
    return sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');
  }

  Booking.findAll({
    where: {
      sharedSpaceId: id,
      userId: req.user.id,
      endDate: {
        [Op.gte]: moment().toDate(),
      },
    },
  })
    .then((bookings: Booking[]) => {
      res.send({ count: bookings.length });
    })
    .catch(() => {
      sendErrorResponse(res, 500, 'booking', 'Error retrieving bookings');
    });
};

export const deleteBooking = (req: Request, res: Response): void => {
  const { id } = req.params;

  if (!id) {
    return sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');
  }

  Booking.findOne({
    where: { id, userId: req.user.id },
    include: [{ model: User, attributes: ['roomNumber'] }],
  })
    .then((booking) => {
      if (!booking) {
        return sendErrorResponse(res, 404, 'booking.not.found', 'Booking not found!');
      }

      if (booking.dataValues.userId !== (req.session as UserSession).user?.id) {
        return sendErrorResponse(res, 403, 'booking.not.allowed.delete', 'You are not allowed to delete this booking!');
      }

      booking.destroy().then(() => {
        const roomNumber = booking.dataValues.user.dataValues.roomNumber;
        io.emit('deletedBooking', { ...booking.toJSON(), roomNumber });
        res.status(204).send({ message: 'Successfully deleted booking!' });
      });
    })
    .catch(() => {
      sendErrorResponse(res, 500, 'booking.error.delete', 'Error deleting booking');
    });
};
