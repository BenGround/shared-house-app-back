import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking } from './booking.model';
import { SharedSpace } from '../sharedSpace/sharedspace.model';
import { UserSession } from '../../types';
import moment from 'moment-timezone';
import { User } from '../user/user.model';

export const create = async (req: Request<unknown, unknown, Booking>, res: Response): Promise<void> => {
  const { sharedSpaceId, startDate, endDate } = req.body;
  const userId = (req.session as UserSession).user?.id;

  if (!userId) {
    res.status(400).send({ errorCode: 'user.not.logged', message: 'You are not logged in!' });
    return;
  }

  if (!sharedSpaceId || !startDate || !endDate) {
    res.status(400).send({ errorCode: 'data.missing', message: 'Missing data!' });
    return;
  }

  const start = moment(startDate).utc().toDate();
  const end = moment(endDate).utc().toDate();

  try {
    const sharedSpace = await SharedSpace.findOne({ where: { id: sharedSpaceId } });
    if (!sharedSpace) {
      res.status(404).send({
        errorCode: 'sharespace.not.existing',
        message: "The shared space you're trying to book does not exist!",
      });
      return;
    }

    const hourDiff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    if (hourDiff <= 0 || hourDiff > sharedSpace.maxBookingHours) {
      res.status(400).send({
        errorCode: 'booking.duration.wrong',
        message: `The booking duration must be less than ${sharedSpace.maxBookingHours} hours and greater than 0!`,
      });
      return;
    }

    const [startDayTimeHours, startDayTimeMinutes] = sharedSpace.startDayTime.split(':').map(Number);
    const startTimeSharedSpace = moment.utc(start).set({
      hour: startDayTimeHours,
      minute: startDayTimeMinutes,
      second: 0,
    });

    const [endDayTimeHours, endDayTimeMinutes] = sharedSpace.endDayTime.split(':').map(Number);
    const endTimeSharedSpace = moment.utc(end).set({
      hour: endDayTimeHours,
      minute: endDayTimeMinutes,
      second: 0,
    });

    if (startDate < startTimeSharedSpace.toDate() || endDate > endTimeSharedSpace.toDate()) {
      res.status(400).send({
        errorCode: 'booking.outside.workinghours',
        message: "Please do a booking inside the shared space's working hours!",
      });
      return;
    }

    const overlappingBooking = await Booking.findOne({
      where: {
        [Op.and]: [{ startDate: { [Op.lt]: end } }, { endDate: { [Op.gt]: start } }, { sharedSpaceId }],
      },
    });

    if (overlappingBooking) {
      res
        .status(409)
        .send({ errorCode: 'booking.already.existing', message: 'There is already a booking for this time slot!' });
      return;
    }

    const maxBookings = sharedSpace.maxBookingByUser;

    Booking.findAll({
      where: {
        sharedSpaceId: sharedSpace.id,
        userId: (req.session as UserSession).user?.id,
        endDate: {
          [Op.gte]: moment(new Date().toISOString()).toDate(),
        },
      },
      include: [
        {
          model: User,
          attributes: ['username'],
        },
      ],
    })
      .then(async (bookings: Booking[]) => {
        if (bookings.length >= maxBookings) {
          res.status(500).send({
            errorCode: 'booking.too.many',
            message: 'You have done too many bookings',
          });
          return;
        }

        const booking = await new Booking({
          startDate: moment.utc(start).toLocaleString(),
          endDate: moment.utc(end).toLocaleString(),
          userId,
          sharedSpaceId,
        }).save();

        res.status(201).send({
          message: 'Booking created successfully!',
          booking: {
            ...booking.toJSON(),
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
        });
      })
      .catch(() => {
        res.status(500).send({
          errorCode: 'booking',
          message: `Error retrieving bookings`,
        });
      });
  } catch (error) {
    res.status(500).send({
      errorCode: 'booking',
      message: 'Error during booking: ' + error,
    });
  }
};

export const findAllBySharePlaceId = (req: Request, res: Response): void => {
  const { id } = req.params;
  const { startDate, endDate } = req.query;

  if (!id) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing id param!',
    });
    return;
  }

  if (!startDate || !endDate) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Both startDate and endDate query parameters are required!',
    });
    return;
  }

  const isValidStartDate = moment(startDate as string, 'YYYY-MM-DD', true).isValid();
  const isValidEndDate = moment(endDate as string, 'YYYY-MM-DD', true).isValid();

  if (!isValidStartDate || !isValidEndDate) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Invalid date format. Please use YYYY-MM-DD format for startDate and endDate.',
    });
    return;
  }

  Booking.findAll({
    where: {
      sharedSpaceId: id,
      startDate: {
        [Op.gte]: moment(startDate as string)
          .startOf('day')
          .add(-1, 'days')
          .toDate(),
      },
      endDate: {
        [Op.lte]: moment(endDate as string)
          .endOf('day')
          .add(1, 'days')
          .toDate(),
      },
    },
    include: [
      {
        model: User,
        attributes: ['username'],
      },
    ],
  })
    .then((bookings: Booking[]) => {
      const formattedBookings = bookings.map((booking) => ({
        id: booking.id,
        username: booking.user.username,
        startDate: moment.utc(booking.startDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        endDate: moment.utc(booking.endDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
      }));

      res.send(formattedBookings);
    })
    .catch(() => {
      res.status(500).send({
        errorCode: 'booking',
        message: `Error retrieving bookings`,
      });
    });
};

export const getNumberBookingsByUser = (req: Request, res: Response): void => {
  const { id } = req.params;

  if (!id) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing id param!',
    });
    return;
  }

  Booking.findAll({
    where: {
      sharedSpaceId: id,
      userId: (req.session as UserSession).user?.id,
      endDate: {
        [Op.gte]: moment(new Date().toISOString()).toDate(),
      },
    },
    include: [
      {
        model: User,
        attributes: ['username'],
      },
    ],
  })
    .then((bookings: Booking[]) => {
      res.send({
        count: bookings.length,
      });
    })
    .catch(() => {
      res.status(500).send({
        errorCode: 'booking',
        message: `Error retrieving bookings`,
      });
    });
};

export const deleteBooking = (req: Request, res: Response): void => {
  const { id } = req.params;

  if (!id) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing id param!',
    });
    return;
  }

  Booking.findByPk(id)
    .then((booking) => {
      if (!booking) {
        res.status(404).send({
          errorCode: 'booking.not.found',
          message: 'Booking not found!',
        });
        return;
      }

      if (booking.userId !== (req.session as UserSession).user?.id) {
        res.status(403).send({
          errorCode: 'booking.not.allowed.delete',
          message: 'You are not allowed to delete this booking!',
        });
        return;
      }

      booking.destroy().then(() => {
        res.status(204).send({ message: 'Successfully deleted booking!' });
      });
    })
    .catch(() => {
      res.status(500).send({
        errorCode: 'booking.error.delete',
        message: `Error deleting booking`,
      });
    });
};
