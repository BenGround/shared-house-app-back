import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { UserSession } from '../../types/session.type';
import { User } from './user.model';
import dotenv from 'dotenv';
import { getUrlImg, removeFileToMinio, upload, uploadFileToMinio } from './../../utils/imageUtils';
import { v4 as uuidv4 } from 'uuid';
import { getMinioClient } from './../../utils/minioClient';
import { sendErrorResponse } from '../../utils/errorUtils';
import { checkingSession, frontUserInfo, generateResetToken, validateRequiredFields } from './user.helper';
import { emailApi } from '../../utils/emailUtils';

dotenv.config();

export const uploadProfilePicture = upload.single('profilePicture');
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    return sendErrorResponse(res, 400, 'file.missing', 'No file uploaded');
  }

  const bucketName = process.env.MINIO_BUCKET;
  if (!bucketName) {
    return sendErrorResponse(res, 500, 'errors.occured', 'Bucket name is missing');
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
      profilePicture: getUrlImg(objectName),
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return sendErrorResponse(res, 500, 'file.upload', 'Error uploading file!');
  }
};

export const deletePicture = async (req: Request, res: Response): Promise<void> => {
  const session = req.user;
  const bucketName = process.env.MINIO_BUCKET;

  if (!session?.profilePicture) {
    return sendErrorResponse(res, 400, 'user.picture.not_found', 'No profile picture to delete');
  }

  if (!bucketName) {
    return sendErrorResponse(res, 400, 'errors.occured', 'Bucket name is missing');
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
      'user.update.picture.failed',
      'Failed to delete profile picture. Please try again later',
    );
  }
};

export const createPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password, confirmPassword } = req.body;

  try {
    const user = await User.findOne({ where: { passwordToken: token } });

    if (!user) return sendErrorResponse(res, 400, 'user.token.invalid', 'Invalid or expired token');
    if (password !== confirmPassword)
      return sendErrorResponse(res, 400, 'user.password.not.match', 'Passwords do not match');

    const hashPassword = await hash(password, 8);

    await user.update({ passwordToken: null, password: hashPassword });

    res.send({ message: 'Password successfully updated', roomNumber: user.dataValues.roomNumber });
  } catch (error) {
    console.error('Error creating password:', error);
    return sendErrorResponse(res, 400, 'user.save.failed', 'Failed to update the password. Please try again later');
  }
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body;
  const session = req.user;

  if (!username) return sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');

  const usernameRegex = /^[a-zA-Z0-9\s_\u3040-\u30FF\u4E00-\u9FFF\u00C0-\u00FF]{3,25}$/;
  if (!usernameRegex.test(username))
    return sendErrorResponse(
      res,
      400,
      'user.username.invalid',
      'Username must be between 3 and 25 characters long and contain only valid characters.',
    );

  try {
    await User.update({ username }, { where: { id: session.id } });
    session.username = username;

    res.status(204).send({ message: 'Username updated successfully.' });
  } catch (error) {
    console.error('Error updating username:', error);
    return sendErrorResponse(res, 500, 'user.update.failed', 'Failed to update username. Please try again later');
  }
};

export const login = async (req: Request<unknown, unknown, User>, res: Response): Promise<void> => {
  const { roomNumber, password } = req.body;

  if (!validateRequiredFields(['roomNumber', 'password'], req.body, res)) return;

  try {
    const user = await User.findOne({ where: { roomNumber } });
    if (!user) return sendErrorResponse(res, 400, 'user.not.found', 'Room number not found');

    const isMatchingPassword = await user.comparePassword(password);
    if (!isMatchingPassword) return sendErrorResponse(res, 400, 'user.password.not.match', "Passwords don't match");

    if (!user.dataValues.isActive) return sendErrorResponse(res, 400, 'user.not.active', 'User not activated');

    (req.session as UserSession).user = user;

    res.status(200).send({ status: true, user: frontUserInfo(user.dataValues) });
  } catch (error) {
    return sendErrorResponse(res, 500, 'user.wrong.credentials', 'Incorrect room number or password!');
  }
};

export const checkSession = async (req: Request, res: Response): Promise<void> => {
  const user = (req.session as UserSession).user;
  const error = await checkingSession(req);

  if (error) {
    return sendErrorResponse(res, error.status, error.code, error.message);
  }

  res.status(200).send({ loggedIn: true, user: frontUserInfo(user) });
};

export const logout = (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) return sendErrorResponse(res, 500, 'user.logout', 'An error occurred while trying to logout!');

    res.clearCookie('connect.sid');
    res.status(200).send({ message: 'Logout successful' });
  });
};

export const findByUsername = async (req: Request, res: Response): Promise<void> => {
  const { username } = req.params;

  if (!username) return sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');

  if (req.user.username !== username) return sendErrorResponse(res, 400, 'forbidden', 'Forbidden!');

  try {
    const user = await User.findOne({ where: { username } });
    res.send(user);
  } catch {
    return sendErrorResponse(res, 500, 'user.not.found', `Error retrieving user with username=${username}`);
  }
};

const checkRoomNumberExists = async (roomNumber: string): Promise<boolean> => {
  const foundUsers = await User.findAll({ where: { roomNumber } });
  return foundUsers.length > 0;
};

export const adminGetUsers = (req: Request, res: Response): void => {
  User.findAll()
    .then((users: User[] | null) => {
      const userInfos = users?.map((user) => frontUserInfo(user.dataValues, true));
      res.send(userInfos);
    })
    .catch(() => sendErrorResponse(res, 500, 'users.retrieving', 'Error retrieving users!'));
};

export const adminUpdateUser = async (req: Request, res: Response): Promise<void> => {
  const { id, username, email, isAdmin, isActive } = req.body;

  if (typeof isAdmin !== 'boolean' || typeof isActive !== 'boolean' || !email) {
    return sendErrorResponse(res, 400, 'data.missing', 'Missing or invalid id param!');
  }

  try {
    await User.update({ username, email, isAdmin, isActive }, { where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error updating user:', error);
    sendErrorResponse(res, 500, 'user.update', 'Failed to update user!');
  }
};

export const adminSendPasswordEmail = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);

    if (!user) {
      return sendErrorResponse(res, 404, 'user.not.found', `User not found with id=${id}`);
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
    sendErrorResponse(res, 500, 'errors.occured', 'Failed to send email!');
  }
};

export const adminCreateUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email, roomNumber, isAdmin, isActive } = req.body;

  if (!roomNumber || !email || typeof isAdmin !== 'boolean' || typeof isActive !== 'boolean') {
    return sendErrorResponse(res, 400, 'data.missing', 'Missing required parameters!');
  }

  try {
    const roomNumberExists = await checkRoomNumberExists(roomNumber);

    if (roomNumberExists) {
      return sendErrorResponse(res, 400, 'user.room.number.already.exists', 'Room number already exists!');
    }

    const user = await User.create({
      username,
      email,
      roomNumber,
      isAdmin,
      isActive,
      password: 'PASSWORD_NOT_SET',
    });

    res.status(201).send(user);
  } catch (error) {
    console.error('Failed to create user:', error);
    sendErrorResponse(res, 500, 'user.create', 'Failed to create user!');
  }
};

export const adminDeleteUser = async (req: Request, res: Response): Promise<void> => {
  const { roomNumbers } = req.body;

  if (!roomNumbers) {
    return sendErrorResponse(res, 400, 'data.missing', 'Missing room number(s) param!');
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
    sendErrorResponse(res, 500, 'users.delete', 'Failed to delete user(s)!');
  }
};
