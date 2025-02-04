import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Booking } from './booking.model';
import { UserSession } from '../../types/session.type';
import moment from 'moment-timezone';
import { User } from '../user/user.model';
import { getUrlImg } from './../../utils/imageUtils';
import { io } from '../../index';
import { sendErrorResponse } from '../../utils/errorUtils';
import { adjustDate, createOrUpdateBooking, isValidDate, validateAndParseId } from './booking.helper';
import { ApiResponse, FrontBooking, FrontBookingCreation } from '../../types/responses.type';
import {
  BOOKING,
  BOOKING_ERROR_DELETE,
  BOOKING_NOT_ALLOWED_DELETE,
  BOOKING_NOT_FOUND,
  DATA_MISSING,
} from '../../types/errorCodes.type';

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: The bookings managing API
 */

/**
 * @swagger
 * /bookings/create:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking for a shared space
 *     description: Creates a new booking for a shared space.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/FrontBookingCreation"
 *     responses:
 *       201:
 *         description: Booking created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: "#/components/schemas/FrontBooking"
 *       400:
 *         description: Bad request. Missing or invalid parameters. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       404:
 *         description: Shared space or booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       409:
 *         description: Conflict due to overlapping bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error processing the booking request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const create = (req: Request<{}, {}, FrontBookingCreation>, res: Response<ApiResponse<FrontBooking>>) =>
  createOrUpdateBooking(req, res, false);

/**
 * @swagger
 * /bookings/update:
 *   put:
 *     tags: [Bookings]
 *     summary: Update a booking for a shared space
 *     description: Updates an existing booking for a shared space.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/FrontBooking"
 *     responses:
 *       201:
 *         description: Successfully updated booking
 *       400:
 *         description: Bad request. Missing or invalid parameters. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       404:
 *         description: Shared space or booking not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       409:
 *         description: Conflict due to overlapping bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error processing the booking request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const update = (req: Request<{}, {}, FrontBooking>, res: Response) => createOrUpdateBooking(req, res, true);

/**
 * @swagger
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get all bookings for a specific shared space within a date range
 *     description: Retrieves all bookings for a shared space within a given date range (startDate and endDate).
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the shared space to fetch bookings for
 *         required: true
 *         schema:
 *           type: string
 *       - name: startDate
 *         in: query
 *         description: The start date of the booking range (YYYY-MM-DD)
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - name: endDate
 *         in: query
 *         description: The end date of the booking range (YYYY-MM-DD)
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of bookings for the shared space within the specified date range
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: "#/components/schemas/FrontBooking"
 *       400:
 *         description: Missing or invalid query parameters. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       404:
 *         description: Shared space not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error retrieving bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const findAllBySharePlaceId = async (
  req: Request<{ id: string }, {}, { startDate: string; endDate: string }>,
  res: Response<ApiResponse<FrontBooking[]>>,
): Promise<void> => {
  const { startDate, endDate } = req.query;

  const parsedId = validateAndParseId(req.params.id, res);
  if (parsedId === null) return;

  if (!startDate || !endDate) {
    return sendErrorResponse(res, 400, DATA_MISSING, 'Both startDate and endDate query parameters are required!');
  }

  if (!isValidDate(startDate as string) || !isValidDate(endDate as string)) {
    return sendErrorResponse(
      res,
      400,
      DATA_MISSING,
      'Invalid date format. Please use YYYY-MM-DD format for startDate and endDate.',
    );
  }

  try {
    const bookings = await Booking.findAll({
      where: {
        sharedSpaceId: parsedId,
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
    });

    const formattedBookings = bookings.map((booking) => {
      const user = booking.getDataValue('user').dataValues;
      return {
        id: booking.id,
        username: user.username,
        roomNumber: user.roomNumber,
        picture: getUrlImg(user.profilePicture),
        startDate: moment.utc(booking.dataValues.startDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        endDate: moment.utc(booking.dataValues.endDate).tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
        sharedSpaceId: parsedId,
      };
    });

    res.status(200).json({ data: formattedBookings });
  } catch (error) {
    sendErrorResponse(res, 500, BOOKING, 'Error retrieving bookings');
  }
};

/**
 * @swagger
 * /bookings/number/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get the number of bookings for a user in a specific shared space
 *     description: Retrieves the number of active bookings for a user in a specific shared space, based on the current date.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the shared space to check the user's bookings for
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The number of active bookings for the user in the shared space
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: integer
 *                       description: The number of active bookings
 *       404:
 *         description: Shared space not found or user not authorized to view bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error retrieving bookings count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const getNumberBookingsByUser = (req: Request<{ id: string }>, res: Response<ApiResponse<number>>): void => {
  const parsedId = validateAndParseId(req.params.id, res);
  if (parsedId === null) return;

  Booking.findAll({
    where: {
      sharedSpaceId: parsedId,
      userId: req.user.id,
      endDate: {
        [Op.gte]: moment().toDate(),
      },
    },
  })
    .then((bookings: Booking[]) => {
      res.send({ data: bookings.length });
    })
    .catch(() => {
      sendErrorResponse(res, 500, BOOKING, 'Error retrieving bookings');
    });
};

/**
 * @swagger
 * /bookings/{id}:
 *   delete:
 *     tags: [Bookings]
 *     summary: Delete a booking for a specific user
 *     description: Deletes a booking for a user if the booking belongs to the user and the booking exists.
 *     parameters:
 *       - name: id
 *         in: path
 *         description: The ID of the booking to delete
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Booking successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *       403:
 *         description: Forbidden. The user is not authorized to delete this booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       404:
 *         description: Booking not found or does not belong to the user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error deleting the booking
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const deleteBooking = (req: Request<{ id: string }>, res: Response<ApiResponse>): void => {
  const parsedId = validateAndParseId(req.params.id, res);
  if (parsedId === null) return;

  Booking.findOne({
    where: { id: parsedId, userId: req.user.id },
    include: [{ model: User, attributes: ['roomNumber'] }],
  })
    .then((booking) => {
      if (!booking) {
        return sendErrorResponse(res, 404, BOOKING_NOT_FOUND, 'Booking not found!');
      }

      if (booking.dataValues.userId !== (req.session as UserSession).user?.id) {
        return sendErrorResponse(res, 403, BOOKING_NOT_ALLOWED_DELETE, 'You are not allowed to delete this booking!');
      }

      booking.destroy().then(() => {
        const roomNumber = booking.dataValues.user.dataValues.roomNumber;
        io.emit('deletedBooking', { ...booking.toJSON(), roomNumber });
        res.status(204).send({ message: 'Successfully deleted booking!' });
      });
    })
    .catch(() => {
      sendErrorResponse(res, 500, BOOKING_ERROR_DELETE, 'Error deleting booking');
    });
};
