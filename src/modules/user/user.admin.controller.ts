import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from './user.model';
import dotenv from 'dotenv';
import { sendErrorResponse } from '../../utils/errorUtils';
import { checkRoomNumberExists, frontUserInfo, generateResetToken } from './user.helper';
import { emailApi } from '../../utils/emailUtils';
import { ApiResponse, FrontUser, FrontUserCreation } from '../../types/responses.type';
import {
  DATA_MISSING,
  ERRORS_OCCURED,
  USER_CREATE,
  USERS_DELETE,
  USER_NOT_FOUND,
  USER_ROOM_NUMBER_ALREADY_EXISTS,
  USER_UPDATE_FAILED,
  USERS_RETRIEVING,
} from '../../types/errorCodes.type';

dotenv.config();

/**
 * @swagger
 * tags:
 *   name: Users - Admin
 *   description: The users managing API for admins
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Users - Admin]
 *     summary: Retrieve a list of all users
 *     description: Fetches all users in the system for administrative purposes.
 *     responses:
 *       200:
 *         description: Successfully retrieved list of users
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
 *                         $ref: "#/components/schemas/FrontUser"
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Error retrieving users
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const adminGetUsers = (req: Request, res: Response<ApiResponse<FrontUser[]>>): void => {
  User.findAll()
    .then((users: User[] | null) => {
      const userInfos = users?.map((user) => frontUserInfo(user.dataValues, true));
      res.send({ data: userInfos });
    })
    .catch(() => sendErrorResponse(res, 500, USERS_RETRIEVING, 'Error retrieving users!'));
};

/**
 * @swagger
 * /admin/user/update:
 *   put:
 *     tags: [Users - Admin]
 *     summary: Update user details
 *     description: Updates the details of a specific user in the system (e.g., username, email, admin status).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/FrontUser"
 *     responses:
 *       204:
 *         description: Successfully updated user
 *       400:
 *         description: Missing or invalid data in the request. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Error updating the user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const adminUpdateUser = async (req: Request<{}, {}, FrontUser>, res: Response<ApiResponse>): Promise<void> => {
  const { id, username, email, isAdmin, isActive } = req.body;

  if (typeof isAdmin !== 'boolean' || typeof isActive !== 'boolean' || !email) {
    return sendErrorResponse(res, 400, DATA_MISSING, 'Missing or invalid id param!');
  }

  try {
    await User.update({ username, email, isAdmin, isActive }, { where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error updating user:', error);
    sendErrorResponse(res, 500, USER_UPDATE_FAILED, 'Failed to update user!');
  }
};

/**
 * @swagger
 * /admin/user/{id}/send-password-email:
 *   post:
 *     tags: [Users - Admin]
 *     summary: Send password reset email
 *     description: Sends a password reset email to the user with a link to create a new password.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The unique identifier of the user.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email sent successfully
 *       404:
 *         description: User not found with the provided ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Failed to send the email or server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const adminSendPasswordEmail = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      return sendErrorResponse(res, 404, USER_NOT_FOUND, `User not found with id=${id}`);
    }

    const to = user.dataValues.email;
    const token = generateResetToken();
    const subject = 'Password Create Request';
    const text = 'Please click the link below to create your password.';
    const html = `<p>Click the link below to create your password: ${process.env.FRONT_URL}/create-password?token=${token}</p>`;

    const emailParams = {
      sender: { email: process.env.EMAIL_USER },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    };

    await emailApi.sendTransacEmail(emailParams);
    await User.update({ passwordToken: token }, { where: { id: user.id } });

    res.status(200).send();
  } catch (error) {
    console.error('Failed to send email:', error);
    sendErrorResponse(res, 500, ERRORS_OCCURED, 'Failed to send email!');
  }
};

/**
 * @swagger
 * /admin/user/create:
 *   post:
 *     tags: [Users - Admin]
 *     summary: Create a new user
 *     description: Creates a new user with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/FrontUserCreation"
 *     responses:
 *       201:
 *         description: User successfully created
 *         content:
 *           application/json:
 *             schema:
 *             allOf:
 *               - $ref: "#/components/schemas/ApiResponse"
 *               - type: object
 *                 properties:
 *                   data:
 *                     $ref: "#/components/schemas/FrontUserCreation"
 *       400:
 *         description: Missing or invalid required parameters. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Error creating user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const adminCreateUser = async (
  req: Request<{}, {}, FrontUserCreation>,
  res: Response<ApiResponse<FrontUser>>,
): Promise<void> => {
  const { username, email, roomNumber, isAdmin, isActive } = req.body;

  if (!roomNumber || !email || typeof isAdmin !== 'boolean' || typeof isActive !== 'boolean') {
    return sendErrorResponse(res, 400, DATA_MISSING, 'Missing required parameters!');
  }

  try {
    const roomNumberExists = await checkRoomNumberExists(roomNumber);

    if (roomNumberExists) {
      return sendErrorResponse(res, 400, USER_ROOM_NUMBER_ALREADY_EXISTS, 'Room number already exists!');
    }

    const user = await User.create({
      username,
      email,
      roomNumber,
      isAdmin,
      isActive,
      password: 'PASSWORD_NOT_SET',
    });

    res.status(201).send({ data: frontUserInfo(user) });
  } catch (error) {
    console.error('Failed to create user:', error);
    sendErrorResponse(res, 500, USER_CREATE, 'Failed to create user!');
  }
};

/**
 * @swagger
 * /admin/user/delete:
 *   post:
 *     tags: [Users - Admin]
 *     summary: Delete users by room number
 *     description: Deletes one or more users based on their room numbers.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomNumbers
 *             properties:
 *               roomNumbers:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of room numbers of users to delete.
 *     responses:
 *       200:
 *         description: Successfully deleted the user(s)
 *       400:
 *         description: Missing or invalid room number(s) parameter. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Error deleting the user(s)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const adminDeleteUser = async (
  req: Request<{}, {}, { roomNumbers: number[] }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  const { roomNumbers } = req.body;

  if (!roomNumbers) {
    return sendErrorResponse(res, 400, DATA_MISSING, 'Missing room number(s) param!');
  }

  try {
    await User.destroy({
      where: {
        roomNumber: { [Op.in]: roomNumbers },
      },
    });
    res.status(200).send();
  } catch (error) {
    console.error('Error deleting user(s):', error);
    sendErrorResponse(res, 500, USERS_DELETE, 'Failed to delete user(s)!');
  }
};
