import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking } from './booking.model';
import { SharedSpace } from '../sharedSpace/sharedspace.model';
import moment from 'moment-timezone';
import { User } from '../user/user.model';
import { io } from '../../index';
import { sendErrorResponse } from '../../utils/errorUtils';
import { getUrlImg } from '../../utils/imageUtils';
import { ApiResponse, FrontBooking, FrontBookingCreation } from '../../types/responses.type';
import { ERRORS_OCCURED } from '../../types/errorCodes.type';

export const isValidDate = (date: string): boolean => moment(date, 'YYYY-MM-DD', true).isValid();

export const adjustDate = (date: string, direction: 'start' | 'end'): Date =>
  moment(date)
    .startOf(direction === 'start' ? 'day' : 'day')
    .add(direction === 'start' ? -1 : 1, 'days')
    .toDate();

const checkOverlappingBooking = async (sharedSpaceId: number, start: Date, end: Date, excludeBookingId?: number) => {
  return await Booking.findOne({
    where: {
      sharedSpaceId,
      [Op.and]: [{ startDate: { [Op.lt]: end } }, { endDate: { [Op.gt]: start } }],
      ...(excludeBookingId && { id: { [Op.not]: excludeBookingId } }),
    },
  });
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

export const createOrUpdateBooking = async (
  req: Request<{}, {}, FrontBookingCreation | FrontBooking>,
  res: Response<ApiResponse>,
  isUpdate: boolean = false,
): Promise<void> => {
  try {
    const { sharedSpaceId, startDate, endDate } = req.body;
    const session = req.user;
    const now = new Date();
    const id = isUpdate && 'id' in req.body ? req.body.id : undefined;

    if (!sharedSpaceId || !startDate || !endDate || (isUpdate && !id)) {
      return sendErrorResponse(res, 400, 'data.missing', 'Missing required parameters!');
    }

    const start = moment(startDate).utc().toDate();
    const end = moment(endDate).utc().toDate();

    let booking: Booking | null = null;

    if (isUpdate) {
      booking = await Booking.findOne({
        where: { id },
        include: [{ model: User, attributes: ['username', 'profilePicture', 'roomNumber', 'id'] }],
      });

      if (!booking) {
        return sendErrorResponse(res, 404, 'booking.not.found', 'Booking not found!');
      }

      if (booking?.dataValues.userId !== session.id) {
        return sendErrorResponse(res, 403, 'booking.unauthorized', 'You are not authorized to update this booking!');
      }
    }

    const sharedId = isUpdate ? booking?.dataValues.sharedSpaceId : sharedSpaceId;
    const sharedSpace = await SharedSpace.findByPk(sharedId);

    if (!sharedSpace) {
      return sendErrorResponse(res, 404, 'sharespace.not.found', 'Shared space not found!');
    }

    const { maxBookingHours, startDayTime, endDayTime, maxBookingByUser } = sharedSpace.dataValues;

    if (start < now) {
      return sendErrorResponse(res, 400, 'bookings.past', "You can't book in the past!");
    }

    const hourDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (hourDiff <= 0 || hourDiff > maxBookingHours) {
      return sendErrorResponse(
        res,
        400,
        'booking.outside.workinghours',
        `Booking duration must be between 1 and ${maxBookingHours} hours!`,
      );
    }

    const startTimeLimit = moment(startDate)
      .utc()
      .set({ hour: Number(startDayTime.split(':')[0]), minute: 0 })
      .toDate();
    const endTimeLimit = moment(endDate)
      .utc()
      .set({ hour: Number(endDayTime.split(':')[0]), minute: 0 })
      .toDate();

    //TODO: find a better solution
    if ((startDate as unknown as Date) < startTimeLimit || (endDate as unknown as Date) > endTimeLimit) {
      return sendErrorResponse(res, 400, 'booking.outside.hours', 'Booking must be within shared space working hours!');
    }

    if (await checkOverlappingBooking(sharedSpaceId, start, end, id)) {
      return sendErrorResponse(res, 409, 'booking.conflict', 'Time slot already booked!');
    }

    if (await checkUserBookingLimit(sharedSpaceId, session.id, maxBookingByUser, now, id)) {
      return sendErrorResponse(res, 400, 'booking.limit.exceeded', 'You have reached the booking limit!');
    }

    if (isUpdate) {
      await booking!.update({ startDate: start, endDate: end });
      if (booking) {
        const { username, picture, roomNumber } = booking?.dataValues?.user?.dataValues;

        io.emit('updatedBooking', {
          id: booking?.dataValues?.id,
          username: username,
          picture: getUrlImg(picture),
          roomNumber: roomNumber,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          sharedSpaceId: sharedId,
        });
      }
    } else {
      booking = await Booking.create({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        userId: session.id,
        sharedSpaceId,
      });

      io.emit('newBooking', {
        id: booking?.dataValues?.id,
        username: session.username,
        picture: getUrlImg(session.profilePicture),
        roomNumber: session.roomNumber,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        sharedSpaceId: sharedId,
      });
    }

    res.status(isUpdate ? 200 : 201).json({
      message: `Booking ${isUpdate ? 'updated' : 'created'} successfully!`,
      data: {
        id: booking?.id,
        username: session.username,
        picture: getUrlImg(session.profilePicture),
        roomNumber: session.roomNumber,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        sharedSpaceId: sharedId,
      },
    });
  } catch (err: unknown) {
    console.error('Booking Error:', err);
    return sendErrorResponse(res, 500, 'booking.error', 'Error processing booking');
  }
};

export const validateAndParseId = (id: string, res: Response): number | null => {
  if (!id) {
    sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');
    return null;
  }

  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    sendErrorResponse(res, 400, ERRORS_OCCURED, 'Invalid shared space ID!');
    return null;
  }

  return parsedId;
};
