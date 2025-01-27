import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { SequelizeScopeError } from 'sequelize';
import { UserSession } from '../../types';
import { User } from './user.model';
import dotenv from 'dotenv';
import crypto from 'crypto';
import multer from 'multer';
import { getBufferImage } from './../../utils/imageUtils';

dotenv.config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const frontUserInfo = (user: User) => {
  return {
    username: user.username || null,
    roomNumber: user.roomNumber,
    email: user.email,
    profilePicture: user.profilePicture ? getBufferImage(user.profilePicture) : null,
  };
};

export const sendEmail = (req: Request, res: Response): void => {
  User.findAll({ where: { isSet: false } })
    .then((users: User[]) => {
      users.forEach(async (user) => {
        const to = user.get('email');
        if (to) {
          const token = generateResetToken();
          const subject = 'Password Create Request';
          const text = 'Please click the link below to create your password.';
          const html = `
            <p>Click the link below to create your password: ${process.env.FRONT_URL}/create-password?token=${token}</p>
          `;

          const sender = {
            email: process.env.EMAIL_USER,
          };

          const receivers = [{ email: to }];

          const emailParams = {
            sender,
            to: receivers,
            subject,
            textContent: text,
            htmlContent: html,
          };

          try {
            await emailApi.sendTransacEmail(emailParams);
            await User.update({ isSet: true, passwordToken: token }, { where: { id: user.id } });
          } catch (error: any) {
            console.error('Failed to send email:', error);
            res.status(500).send({ errorCode: 'email.failed', message: 'Failed to send email.' });
            return;
          }
        }
      });
    })
    .catch((error) => {
      console.error('Error fetching users:', error);
      res.status(500).send({
        errorCode: 'user.not.found',
        message: 'No users found or error occurred.',
      });
    });

  res.send();
};

const generateResetToken = (): string => {
  return crypto.randomBytes(20).toString('hex');
};

export const createPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, password, confirmPassword } = req.body;

  try {
    const user = await User.findOne({ where: { passwordToken: token } });

    if (!user) {
      res.status(400).send({ error: 'Invalid or expired token' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).send({ error: 'Passwords do not match' });
      return;
    }

    const hashPassword = await hash(password, 8);

    user.set({
      passwordToken: null,
      password: hashPassword,
    });

    await user.save();

    res.send({ message: 'Password successfully updated', roomNumber: user.dataValues.roomNumber });
  } catch (error) {
    console.error('Error creating password:', error);
    res.status(500).send({
      errorCode: 'user.save.failed',
      message: 'Failed to update the password. Please try again later.',
    });
  }
};

export const register = (req: Request<unknown, unknown, User>, res: Response): void => {
  const { username, roomNumber, password, email, isAdmin } = req.body;

  if (!username || !roomNumber || !password || !email) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  User.findOne({ where: { roomNumber } })
    .then((foundUser: User | null) => {
      if (foundUser) {
        throw new Error('An user already exists! Try to log in or choose another room number.');
      }
    })
    .then(() => hash(password, 8))
    .then(
      (passwordHash: string) =>
        new User({
          username,
          roomNumber,
          password: passwordHash,
          email,
          isAdmin,
        }),
    )
    .then((user: User) => user.save())
    .then((savedUser: User) => {
      (req.session as UserSession).user = savedUser;
      res.status(201).send();
    })
    .catch((err: SequelizeScopeError) => {
      res.status(500).send({
        errorCode: 'user.creation',
        message: err.message || 'Some error occurred while creating the user.',
      });
    });
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body;
  const user = (req.session as UserSession).user;

  if (!user) {
    res.status(401).send({
      errorCode: 'user.unauthorized',
      message: 'User is not authenticated.',
    });
    return;
  }

  if (!username) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'No username provided.',
    });
    return;
  }

  try {
    await User.update({ username }, { where: { id: user.id } });
    const session = (req.session as UserSession).user;
    if (session) {
      session.username = username;
    }

    res.status(200).send({
      message: 'Username updated successfully.',
    });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).send({
      errorCode: 'user.update.failed',
      message: 'Failed to update username. Please try again later.',
    });
  }
};

const storage = multer.memoryStorage();
const upload = multer({ storage });

export const updatePicture = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).send({
      errorCode: 'file.missing',
      message: 'No file uploaded.',
    });
    return;
  }

  const user = (req.session as UserSession).user;

  if (!user) {
    res.status(401).send({
      errorCode: 'user.unauthorized',
      message: 'User is not authenticated.',
    });
    return;
  }

  const profilePictureBuffer = req.file.buffer;

  try {
    await User.update({ profilePicture: profilePictureBuffer }, { where: { id: user.id } });
    const session = (req.session as UserSession).user;

    if (session) {
      session.profilePicture = profilePictureBuffer;
    }

    res.status(200).send({
      message: 'Profile picture updated successfully.',
      profilePicture: `data:image/png;base64,${profilePictureBuffer.toString('base64')}`,
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).send({
      errorCode: 'user.update.picture.failed',
      message: 'Failed to update profile picture. Please try again later.',
    });
  }
};

export const uploadProfilePicture = upload.single('profilePicture');

export const login = (req: Request<unknown, unknown, User>, res: Response): void => {
  const { roomNumber, password } = req.body;

  if (!roomNumber || !password) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing room number or password!',
    });
    return;
  }

  User.findOne({ where: { roomNumber } })
    .then((user: User | null) => {
      if (!user) {
        throw new Error('Room number not found');
      }

      return user.comparePassword(password).then((isMatchingPassword: boolean) => ({
        user,
        isMatchingPassword,
      }));
    })
    .then(({ user, isMatchingPassword }) => {
      if (!isMatchingPassword) {
        throw new Error("Passwords don't match");
      }

      (req.session as UserSession).user = user;

      res.status(200).send({
        status: true,
        user: frontUserInfo(user),
      });
    })
    .catch(() => {
      res.status(401).send({
        status: false,
        errorCode: 'user.wrong.credentials',
        message: 'Incorrect room number or password!',
      });
    });
};

export const checkSession = (req: Request, res: Response): void => {
  const user = (req.session as UserSession).user;

  if (user) {
    res.status(200).send({ loggedIn: true, user: frontUserInfo(user) });
    return;
  }

  res.status(200).send({ loggedIn: false });
};

export const logout = (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).send({
        errorCode: 'user.logout',
        message: 'An error occurred while trying to logout!',
      });
    }

    res.clearCookie('connect.sid');
    res.status(200).send({ message: 'Logout successful' });
  });
};

export const findByUsername = (req: Request, res: Response): void => {
  const { username } = req.params;

  if (!username) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing username param!',
    });
    return;
  }

  if ((req.session as UserSession).user?.dataValues.username !== username) {
    res.status(400).send({
      errorCode: 'forbidden',
      message: 'Forbidden!',
    });
    return;
  }

  User.findOne({ where: { username } })
    .then((user: User | null) => {
      res.send(user);
    })
    .catch(() => {
      res.status(500).send({
        errorCode: 'user.not.found',
        message: `Error retrieving user with username=${username}`,
      });
    });
};
