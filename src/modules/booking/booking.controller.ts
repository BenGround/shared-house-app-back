import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking } from './booking.model';
import { SharedSpace } from '../sharedSpace/sharedspace.model';
import { UserSession } from '../../types';
import moment from 'moment-timezone';
import { User } from '../user/user.model';
import { getBufferImage } from './../../utils/imageUtils';
import { io } from '../../index';

export const create = async (req: Request<unknown, unknown, Booking>, res: Response): Promise<void> => {
  const { sharedSpaceId, startDate, endDate } = req.body;
  const session = req.user;

  if (!sharedSpaceId || !startDate || !endDate) {
    res.status(400).send({ errorCode: 'data.missing', message: 'Missing data!' });
    return;
  }

  const start = moment(startDate).utc().toDate();
  const end = moment(endDate).utc().toDate();
  const now = new Date();

  if (start < now) {
    res.status(404).send({
      errorCode: 'bookings.cannotBookInPast',
      message: "You can't book in the past!",
    });
    return;
  }

  try {
    const sharedSpace = await SharedSpace.findOne({ where: { id: sharedSpaceId } });
    if (!sharedSpace) {
      res.status(404).send({
        errorCode: 'sharespace.not.existing',
        message: "The shared space you're trying to book does not exist!",
      });
      return;
    }

    const { id, maxBookingHours, startDayTime, endDayTime, maxBookingByUser } = sharedSpace.dataValues;

    const hourDiff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    if (hourDiff <= 0 || hourDiff > maxBookingHours) {
      res.status(400).send({
        errorCode: 'booking.duration.wrong',
        message: `The booking duration must be less than ${maxBookingHours} hours and greater than 0!`,
      });
      return;
    }

    const [startDayTimeHours, startDayTimeMinutes] = startDayTime.split(':').map(Number);
    const startTimeSharedSpace = moment.utc(start).set({
      hour: startDayTimeHours,
      minute: startDayTimeMinutes,
      second: 0,
    });

    const [endDayTimeHours, endDayTimeMinutes] = endDayTime.split(':').map(Number);
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

    Booking.findAll({
      where: {
        sharedSpaceId: id,
        userId: session.id,
        endDate: {
          [Op.gte]: moment(new Date().toISOString()).toDate(),
        },
      },
    })
      .then(async (bookings: Booking[]) => {
        if (bookings.length >= maxBookingByUser) {
          res.status(500).send({
            errorCode: 'booking.too.many',
            message: 'You have done too many bookings',
          });
          return;
        }

        const booking = await new Booking({
          startDate: moment.utc(start).toLocaleString(),
          endDate: moment.utc(end).toLocaleString(),
          userId: session.id,
          sharedSpaceId,
        }).save();

        io.emit('newBooking', {
          ...booking.toJSON(),
          username: session.username,
          picture: getBufferImage(session.profilePicture),
          roomNumber: session.roomNumber,
          startDate: moment.utc(start).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
          endDate: moment.utc(end).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        });
        res.status(201).send({
          message: 'Booking created successfully!',
          booking: {
            ...booking.toJSON(),
            username: session.username,
            picture: getBufferImage(session.profilePicture),
            roomNumber: session.roomNumber,
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

export const update = async (req: Request, res: Response): Promise<void> => {
  const { bookingId, startDate, endDate } = req.body;
  const session = req.user;

  if (!bookingId || !startDate || !endDate) {
    res.status(400).send({ errorCode: 'data.missing', message: 'Missing data!' });
    return;
  }

  const start = moment(startDate).utc().toDate();
  const end = moment(endDate).utc().toDate();
  const now = new Date();

  try {
    const booking = await Booking.findOne({
      where: { id: bookingId },
      include: [
        {
          model: SharedSpace,
          attributes: ['maxBookingHours', 'startDayTime', 'endDayTime', 'maxBookingByUser'],
        },
        {
          model: User,
          attributes: ['username', 'roomNumber', 'profilePicture'],
        },
      ],
    });

    if (!booking) {
      res.status(404).send({
        errorCode: 'booking.not.existing',
        message: "The booking you're trying to update does not exist!",
      });
      return;
    }

    if (booking.dataValues.userId !== session.id) {
      res.status(404).send({
        errorCode: 'booking.other.user',
        message: 'You can only update your bookings!',
      });
      return;
    }

    if (booking.dataValues.startDate < now) {
      res.status(400).send({
        errorCode: 'bookings.cannotUpdatePastBookings',
        message: `Cannot update past bookings!`,
      });
      return;
    }

    if (start < now) {
      res.status(404).send({
        errorCode: 'bookings.cannotBookInPast',
        message: "You can't book in the past!",
      });
      return;
    }

    const { maxBookingHours, startDayTime, endDayTime, maxBookingByUser } = booking.dataValues.sharedSpace.dataValues;

    const hourDiff = (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    if (hourDiff <= 0 || hourDiff > maxBookingHours) {
      res.status(400).send({
        errorCode: 'booking.duration.wrong',
        message: `The booking duration must be less than ${maxBookingHours} hours and greater than 0!`,
      });
      return;
    }

    const [startDayTimeHours, startDayTimeMinutes] = startDayTime.split(':').map(Number);
    const startTimeSharedSpace = moment.utc(start).set({
      hour: startDayTimeHours,
      minute: startDayTimeMinutes,
      second: 0,
    });

    const [endDayTimeHours, endDayTimeMinutes] = endDayTime.split(':').map(Number);
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
        [Op.and]: [
          { startDate: { [Op.lt]: end } },
          { endDate: { [Op.gt]: start } },
          { id: { [Op.not]: bookingId } },
          { sharedSpaceId: booking.dataValues.sharedSpaceId },
        ],
      },
    });

    if (overlappingBooking) {
      res
        .status(409)
        .send({ errorCode: 'booking.already.existing', message: 'There is already a booking for this time slot!' });
      return;
    }

    Booking.findAll({
      where: {
        sharedSpaceId: booking.dataValues.sharedSpaceId,
        userId: session.id,
        endDate: {
          [Op.gte]: moment(new Date().toISOString()).toDate(),
        },
      },
    })
      .then(async (bookings: Booking[]) => {
        if (bookings.length - 1 >= maxBookingByUser) {
          res.status(500).send({
            errorCode: 'booking.too.many',
            message: 'You have done too many bookings',
          });
          return;
        }

        await Booking.update(
          { startDate: moment.utc(start).toLocaleString(), endDate: moment.utc(end).toLocaleString() },
          { where: { id: bookingId } },
        );

        const { username, profilePicture, roomNumber } = booking.dataValues.user.dataValues;
        io.emit('updatedBooking', {
          ...booking.toJSON(),
          username: username,
          picture: getBufferImage(profilePicture),
          roomNumber: roomNumber,
          startDate: moment.utc(start).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
          endDate: moment.utc(end).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        });

        res.status(204).send({
          message: 'Booking updated successfully!',
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
          picture: getBufferImage(user.profilePicture),
          startDate: moment.utc(booking.dataValues.startDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
          endDate: moment.utc(booking.dataValues.endDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        };
      });

      res.send(formattedBookings);
    })
    .catch((error: any) => {
      res.status(500).send({
        errorCode: 'booking',
        message: `Error retrieving bookings ${error}`,
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
      userId: req.user.id,
      endDate: {
        [Op.gte]: moment(new Date().toISOString()).toDate(),
      },
    },
  })
    .then((bookings: Booking[]) => {
      res.send({
        count: bookings.length,
      });
    })
    .catch((error: any) => {
      res.status(500).send({
        errorCode: 'booking',
        message: `Error retrieving bookings ${error}`,
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

  Booking.findOne({
    where: { id, userId: req.user.id },
    include: [
      {
        model: User,
        attributes: ['roomNumber'],
      },
    ],
  })
    .then((booking) => {
      if (!booking) {
        res.status(404).send({
          errorCode: 'booking.not.found',
          message: 'Booking not found!',
        });
        return;
      }

      if (booking.dataValues.userId !== (req.session as UserSession).user?.id) {
        res.status(403).send({
          errorCode: 'booking.not.allowed.delete',
          message: 'You are not allowed to delete this booking!',
        });
        return;
      }

      booking.destroy().then(() => {
        const roomNumber = booking.dataValues.user.dataValues.roomNumber;
        io.emit('deletedBooking', { ...booking.toJSON(), roomNumber });
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
