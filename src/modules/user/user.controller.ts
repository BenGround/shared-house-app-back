import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { UserSession } from '../../types/session.type';
import { User } from './user.model';
import dotenv from 'dotenv';
import { getUrlImg, removeFileToMinio, upload, uploadFileToMinio } from './../../utils/imageUtils';
import { v4 as uuidv4 } from 'uuid';
import { getMinioClient } from './../../utils/minioClient';
import { sendErrorResponse } from '../../utils/errorUtils';
import { checkingSession, frontUserInfo, validateRequiredFields } from './user.helper';
import { ApiResponse, FrontUser, FrontUserCreation } from '../../types/responses.type';
import {
  DATA_MISSING,
  ERRORS_OCCURED,
  FILE_MISSING,
  USER_LOGOUT,
  USER_NAME_INVALID,
  USER_NOT_ACTIVE,
  USER_NOT_FOUND,
  USER_PASSWORD_MISMACTH,
  USER_PICTURE_NOT_FOUND,
  USER_SAVE_FAILED,
  USER_TOKEN_INVALID,
  USER_UPDATE_FAILED,
  USER_UPDATE_PICTURE_FAILED,
  USER_WRONG_CREDENTIALS,
} from '../../types/errorCodes.type';
import { AuthenticatedRequest } from '../../types/requests.type';

dotenv.config();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: The users managing API
 */

/**
 * @swagger
 * /user/upload-image/{id}:
 *   post:
 *     tags: [Users]
 *     summary: Upload a new profile picture
 *     description: Allows a user to upload a new profile picture. If a profile picture already exists, it will be replaced.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the user uploading the profile picture.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload as the new profile picture.
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating the profile picture was uploaded.
 *                 data:
 *                   type: string
 *                   description: URL of the uploaded profile picture.
 *       400:
 *         description: No file uploaded or invalid file. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Internal error occurred while uploading the profile picture
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const uploadProfilePicture = upload.single('profilePicture');
export const uploadImage = async (
  req: Request<{ id: string }> & { file?: Express.Multer.File },
  res: Response<ApiResponse<string>>,
): Promise<void> => {
  if (!req.file) {
    return sendErrorResponse(res, 400, FILE_MISSING, 'No file uploaded');
  }

  const bucketName = process.env.MINIO_BUCKET;
  if (!bucketName) {
    return sendErrorResponse(res, 500, ERRORS_OCCURED, 'Bucket name is missing');
  }

  const session = req.user;
  const uniqueToken = uuidv4();

  if (session.profilePicture) {
    await removeFileToMinio(bucketName, session.profilePicture);
  }

  try {
    const objectName = await uploadFileToMinio(req.file, bucketName, uniqueToken);
    await User.update({ profilePicture: objectName }, { where: { id: session.id } });

    session.profilePicture = objectName;

    res.status(200).send({
      message: 'Profile picture updated successfully.',
      data: getUrlImg(objectName),
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return sendErrorResponse(res, 500, USER_UPDATE_PICTURE_FAILED, 'Error uploading file!');
  }
};

/**
 * @swagger
 * /user/delete-picture:
 *   delete:
 *     tags: [Users]
 *     summary: Delete the user's profile picture
 *     description: Allows a user to delete their profile picture. If the user does not have a profile picture, an error is returned.
 *     responses:
 *       204:
 *         description: Profile picture deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message indicating the profile picture was deleted.
 *       400:
 *         description: No profile picture to delete or bucket name missing. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error deleting profile picture
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const deletePicture = async (req: Request<AuthenticatedRequest>, res: Response<ApiResponse>): Promise<void> => {
  const session = req.user;
  const bucketName = process.env.MINIO_BUCKET;

  if (!session?.profilePicture) {
    return sendErrorResponse(res, 400, USER_PICTURE_NOT_FOUND, 'No profile picture to delete');
  }

  if (!bucketName) {
    return sendErrorResponse(res, 400, ERRORS_OCCURED, 'Bucket name is missing');
  }

  try {
    await User.update({ profilePicture: null }, { where: { id: session.id } });
    await getMinioClient().removeObject(bucketName, session.profilePicture);

    session.profilePicture = undefined;

    res.status(204).json({
      message: 'Profile picture deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    return sendErrorResponse(
      res,
      500,
      USER_UPDATE_PICTURE_FAILED,
      'Failed to delete profile picture. Please try again later',
    );
  }
};

/**
 * @swagger
 * /user/create-password:
 *   post:
 *     tags: [Users]
 *     summary: Create a new password for the user
 *     description: Allows a user to create a new password using a reset token. The password and confirmation must match.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: The token received by the user for resetting the password.
 *               password:
 *                 type: string
 *                 description: The new password the user wants to set.
 *               confirmPassword:
 *                 type: string
 *                 description: Confirmation of the new password to ensure it matches.
 *     responses:
 *       200:
 *         description: Password successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Success message.
 *                 data:
 *                   type: integer
 *                   description: The user's room number.
 *       400:
 *         description: Invalid or expired token or password mismatch
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error updating password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const createPassword = async (
  req: Request<{}, {}, { token: string; password: string; confirmPassword: string }>,
  res: Response<ApiResponse<string>>,
): Promise<void> => {
  const { token, password, confirmPassword } = req.body;

  try {
    const user = await User.findOne({ where: { passwordToken: token } });

    if (!user) return sendErrorResponse(res, 400, USER_TOKEN_INVALID, 'Invalid or expired token');
    if (password !== confirmPassword)
      return sendErrorResponse(res, 400, USER_PASSWORD_MISMACTH, 'Passwords do not match');

    const hashPassword = await hash(password, 8);

    await user.update({ passwordToken: null, password: hashPassword });

    res.send({ message: 'Password successfully updated', data: user.dataValues.roomNumber });
  } catch (error) {
    console.error('Error creating password:', error);
    return sendErrorResponse(res, 400, USER_SAVE_FAILED, 'Failed to update the password. Please try again later');
  }
};

/**
 * @swagger
 * /user/update:
 *   post:
 *     tags: [Users]
 *     summary: Update username
 *     description: Updates the username of the currently authenticated user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: "The new username to set for the authenticated user."
 *     responses:
 *       204:
 *         description: Username updated successfully
 *       400:
 *         description: Missing or invalid parameters. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Error updating the username
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const update = async (
  req: Request<AuthenticatedRequest, {}, { username: string }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  const { username } = req.body;
  const session = req.user;

  if (!username) return sendErrorResponse(res, 400, DATA_MISSING, 'Missing id param!');

  const usernameRegex = /^[a-zA-Z0-9\s_\u3040-\u30FF\u4E00-\u9FFF\u00C0-\u00FF]{3,25}$/;
  if (!usernameRegex.test(username))
    return sendErrorResponse(
      res,
      400,
      USER_NAME_INVALID,
      'Username must be between 3 and 25 characters long and contain only valid characters.',
    );

  try {
    await User.update({ username }, { where: { id: session.id } });
    session.username = username;

    res.status(204).send({ message: 'Username updated successfully.' });
  } catch (error) {
    console.error('Error updating username:', error);
    return sendErrorResponse(res, 500, USER_UPDATE_FAILED, 'Failed to update username. Please try again later');
  }
};

/**
 * @swagger
 * /user/login:
 *   post:
 *     tags: [Users]
 *     summary: Login user
 *     description: Authenticate a user using room number and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomNumber
 *               - password
 *             properties:
 *               roomNumber:
 *                 type: string
 *                 description: The room number of the user.
 *               password:
 *                 type: string
 *                 format: password
 *                 description: The user's password.
 *     responses:
 *       200:
 *         description: Successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: "#/components/schemas/FrontUser"
 *       400:
 *         description: Invalid credentials or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const login = async (
  req: Request<{}, {}, { roomNumber: string; password: string }>,
  res: Response<ApiResponse<FrontUser>>,
): Promise<void> => {
  const { roomNumber, password } = req.body;

  if (!validateRequiredFields(['roomNumber', 'password'], req.body, res)) return;

  try {
    const user = await User.findOne({ where: { roomNumber } });
    if (!user) return sendErrorResponse(res, 400, USER_NOT_FOUND, 'Room number not found');

    const isMatchingPassword = await user.comparePassword(password);
    if (!isMatchingPassword)
      return sendErrorResponse(res, 400, USER_WRONG_CREDENTIALS, 'Incorrect room number or password!');

    if (!user.dataValues.isActive) return sendErrorResponse(res, 400, USER_NOT_ACTIVE, 'User not activated');

    (req.session as UserSession).user = user;

    res.status(200).send({ data: frontUserInfo(user.dataValues) });
  } catch (error) {
    return sendErrorResponse(res, 500, USER_WRONG_CREDENTIALS, 'Incorrect room number or password!');
  }
};

/**
 * @swagger
 * /user/check-session:
 *   get:
 *     tags: [Users]
 *     summary: Check if the user session is valid
 *     description: Verifies if the user is authenticated and the session is valid.
 *     responses:
 *       200:
 *         description: Successfully checked the session and retrieved user data
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: "#/components/schemas/FrontUser"
 *       400:
 *         description: Invalid or expired session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const checkSession = async (req: AuthenticatedRequest, res: Response<ApiResponse<FrontUser>>): Promise<void> => {
  const user = (req.session as UserSession).user;
  const error = await checkingSession(req);

  if (error) {
    return sendErrorResponse(res, error.status, error.code, error.message);
  }

  res.status(200).send({ data: frontUserInfo(user) });
};

/**
 * @swagger
 * /user/logout:
 *   post:
 *     tags: [Users]
 *     summary: Logout user
 *     description: Logs out the user by destroying the session and clearing the session cookie.
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Logout successful"
 *       500:
 *         description: An error occurred during logout
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const logout = (req: Request, res: Response<ApiResponse>): void => {
  req.session.destroy((err) => {
    if (err) return sendErrorResponse(res, 500, USER_LOGOUT, 'An error occurred while trying to logout!');

    res.clearCookie('connect.sid');
    res.status(200).send({ message: 'Logout successful' });
  });
};
