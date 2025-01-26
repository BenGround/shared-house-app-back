import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { Op, SequelizeScopeError } from 'sequelize';
import { UserSession } from '../../types';
import { User } from './user.model';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

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
          } catch (error: any) {
            throw new Error('Failed to send email: ' + error);
          }

          try {
            await User.update({ isSet: true, passwordToken: token }, { where: { id: user.id } });
          } catch (error) {
            throw new Error('Failed to update user');
          }
        }
      });
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send({
        errorCode: 'user.not.found',
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

    // Save the user instance to persist changes
    await user.save();

    res.send({ message: 'Password successfully updated', roomNumber: user.dataValues.roomNumber });
  } catch (error) {
    console.error(error);
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

  User.findOne({
    where: { roomNumber },
  })
    .then((foundUser: User | null) => {
      if (foundUser) {
        throw new Error('An user already exists! Try to log in or chose another username or room number.');
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

export const login = (req: Request<unknown, unknown, User>, res: Response): void => {
  if (!req.body.roomNumber || !req.body.password) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing username or password!',
    });
    return;
  }

  User.findOne({ where: { roomNumber: req.body.roomNumber } })
    .then((user: User | null) => {
      if (!user) {
        throw new Error('Room number not found');
      }

      return user.comparePasswrod(req.body.password).then((isMatchingPassword) => ({
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
        user: {
          username: user?.dataValues.username,
          email: user.dataValues.email,
          roomNumber: user.dataValues.roomNumber,
        },
      });
    })
    .catch(() => {
      res.status(401).send({
        status: false,
        errorCode: 'user.wrong.credentails',
        message: 'Incorrect username or password!',
      });
    });
};

export const checkSession = (req: Request, res: Response): void => {
  const user = (req.session as UserSession).user;

  if (user) {
    res.status(200).send({ loggedIn: true, user });
    return;
  }

  res.status(200).send({ loggedIn: false });
};

export const logout = (req: Request, res: Response): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).send({
        errorCode: 'user.logout',
        message: 'An error occured while trying to logout!',
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
        message: `Error retrieving User with username=${username}`,
      });
    });
};
