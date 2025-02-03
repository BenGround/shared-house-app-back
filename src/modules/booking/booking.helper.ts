import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking } from './booking.model';
import { SharedSpace } from '../sharedSpace/sharedspace.model';
import moment from 'moment-timezone';
import { User } from '../user/user.model';
import { io } from '../../index';
import { sendErrorResponse } from '../../utils/errorUtils';
import { getUrlImg } from '../../utils/imageUtils';

export const isValidDate = (date: string): boolean => moment(date, 'YYYY-MM-DD', true).isValid();

export const adjustDate = (date: string, direction: 'start' | 'end'): Date => {
  return direction === 'start'
    ? moment(date).startOf('day').add(-1, 'days').toDate()
    : moment(date).endOf('day').add(1, 'days').toDate();
};

const checkOverlappingBooking = async (sharedSpaceId: number, start: Date, end: Date, excludeBookingId?: number) => {
  const query: any = {
    where: {
      sharedSpaceId,
      [Op.and]: [{ startDate: { [Op.lt]: end } }, { endDate: { [Op.gt]: start } }],
    },
  };

  if (excludeBookingId) {
    query.where.id = { [Op.not]: excludeBookingId };
  }

  return await Booking.findOne(query);
};

const checkUserBookingLimit = async (
  sharedSpaceId: number,
  userId: number,
  maxBookingByUser: number,
  now: Date,
  excludeBookingId?: number,
) => {
  const userBookingsCount = await Booking.count({
    where: {
      sharedSpaceId,
      userId,
      endDate: { [Op.gte]: now },
      ...(excludeBookingId && { id: { [Op.not]: excludeBookingId } }),
    },
  });

  return userBookingsCount >= maxBookingByUser;
};

export const createOrUpdateBooking = async (req: Request, res: Response, isUpdate: boolean = false): Promise<void> => {
  try {
    const { sharedSpaceId, startDate, endDate, bookingId } = req.body;
    const session = req.user;
    const now = new Date();

    if (!sharedSpaceId || !startDate || !endDate || (isUpdate && !bookingId)) {
      return sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');
    }

    const start = moment(startDate).utc().toDate();
    const end = moment(endDate).utc().toDate();

    let booking: Booking | null = null;

    if (isUpdate) {
      booking = await Booking.findOne({ where: { id: bookingId }, include: [SharedSpace, User] });
      if (!booking || booking.dataValues.userId !== session.id) {
        return sendErrorResponse(res, 403, 'booking.unauthorized', 'Unauthorized or booking not found!');
      }
    }

    const sharedSpace = await SharedSpace.findOne({ where: { id: sharedSpaceId } });
    if (!sharedSpace) {
      return sendErrorResponse(res, 404, 'sharespace.not.existing', 'Shared space not found!');
    }

    const { maxBookingHours, startDayTime, endDayTime } = sharedSpace.dataValues;

    if (start < now) {
      return sendErrorResponse(res, 400, 'bookings.cannotBookInPast', "You can't book in the past!");
    }

    const hourDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hourDiff <= 0 || hourDiff > maxBookingHours) {
      return sendErrorResponse(
        res,
        400,
        'booking.duration.wrong',
        `The booking duration must be between 1 and ${maxBookingHours} hours!`,
      );
    }

    const [startHour, startMinute] = startDayTime.split(':').map(Number);
    const [endHour, endMinute] = endDayTime.split(':').map(Number);
    const startTimeLimit = moment(startDate).utc().set({ hour: startHour, minute: startMinute, second: 0 }).toDate();
    const endTimeLimit = moment(endDate).utc().set({ hour: endHour, minute: endMinute, second: 0 }).toDate();

    if (startDate < startTimeLimit || endDate > endTimeLimit) {
      return sendErrorResponse(
        res,
        400,
        'booking.outside.workinghours',
        "Please book within the shared space's working hours!",
      );
    }

    if (await checkOverlappingBooking(sharedSpaceId, start, end, isUpdate ? bookingId : undefined)) {
      return sendErrorResponse(res, 409, 'booking.already.existing', 'Time slot already booked!');
    }

    if (
      await checkUserBookingLimit(
        sharedSpaceId,
        session.id,
        sharedSpace.maxBookingByUser,
        now,
        isUpdate ? bookingId : undefined,
      )
    ) {
      return sendErrorResponse(res, 400, 'booking.too.many', 'User booking limit reached!');
    }

    if (isUpdate) {
      await booking!.update({ startDate: start.toISOString(), endDate: end.toISOString() });
      io.emit('updatedBooking', { ...booking!.toJSON(), username: session.username });
    } else {
      booking = await Booking.create({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        userId: session.id,
        sharedSpaceId,
      });
      io.emit('newBooking', { ...booking.toJSON(), username: session.username });
    }

    res.status(isUpdate ? 200 : 201).json({
      message: `Booking ${isUpdate ? 'updated' : 'created'} successfully!`,
      booking: {
        id: booking?.id,
        username: session.username,
        picture: getUrlImg(session.profilePicture),
        roomNumber: session.roomNumber,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
    });
  } catch (err: unknown) {
    console.log(err);
    return sendErrorResponse(res, 500, 'booking.error', 'Error processing booking');
  }
};
