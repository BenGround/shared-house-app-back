import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { Op, SequelizeScopeError } from 'sequelize';
import { UserSession } from '../../types';
import { User } from './user.model';
import dotenv from 'dotenv';
import crypto from 'crypto';
import multer from 'multer';
import { getUrlImg } from './../../utils/imageUtils';
import { v4 as uuidv4 } from 'uuid';
import { getMinioClient } from './../../utils/minioClient';

dotenv.config();
const SibApiV3Sdk = require('sib-api-v3-sdk');
const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const frontUserInfo = (user: User, forAdmin: boolean = false) => {
  const userInfos: Record<string, any> = {
    username: user.username || null,
    roomNumber: user.roomNumber,
    email: user.email,
    profilePicture: user.profilePicture ? getUrlImg(user.profilePicture) : null,
    isAdmin: Boolean(user.isAdmin),
  };

  if (forAdmin) {
    userInfos.isSet = user.isSet;
    userInfos.id = user.id;
  }

  return userInfos;
};

const generateResetToken = (): string => {
  return crypto.randomBytes(20).toString('hex');
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only PNG, JPEG, and GIF are allowed.'));
    } else {
      cb(null, true);
    }
  },
});

export const uploadProfilePicture = upload.single('profilePicture');
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).send('No file uploaded');
    return;
  }
  const bucketName = process.env.MINIO_BUCKET;

  if (!bucketName) {
    res.status(500).send({ errorCode: 'errors.occured' });
    return;
  }

  const minioClient = getMinioClient();
  const session = req.user;
  const uniqueToken = uuidv4();
  const fileExtension = req.file.originalname.split('.').pop();
  const objectName = `images/${uniqueToken}.${fileExtension}`;

  if (session.profilePicture) {
    try {
      await minioClient.removeObject(bucketName, session.profilePicture);
    } catch (minioError) {
      console.error('Error deleting image from MinIO:', minioError);
    }
  }

  minioClient.putObject(
    bucketName,
    objectName,
    req.file.buffer,
    req.file.size,
    async (err: Error | null, etag: string | undefined) => {
      if (err) {
        res.status(500).send(`Error uploading file: ${err.message}`);
        return;
      }

      try {
        await User.update({ profilePicture: objectName }, { where: { id: session.id } });

        if (session) {
          session.profilePicture = objectName;
        }

        res.status(200).send({
          message: 'Profile picture updated successfully.',
          profilePicture: getUrlImg(objectName),
        });
      } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).send({
          errorCode: 'user.update.picture.failed',
          message: 'Failed to update profile picture. Please try again later.',
        });
      }
    },
  );
};
export const deletePicture = async (req: Request, res: Response): Promise<void> => {
  const session = req.user;
  const bucketName = process.env.MINIO_BUCKET;

  if (!session?.profilePicture) {
    res.status(400).json({
      errorCode: 'user.picture.not_found',
      message: 'No profile picture to delete.',
    });
    return;
  }

  if (!bucketName) {
    res.status(500).send({ errorCode: 'errors.occured' });
    return;
  }

  try {
    await User.update({ profilePicture: null }, { where: { id: session.id } });

    await getMinioClient().removeObject(bucketName, session.profilePicture);

    session.profilePicture = undefined;

    res.status(204).json({
      message: 'Profile picture deleted successfully.',
    });
  } catch (dbError) {
    console.error('Error updating profile picture in database:', dbError);
    res.status(500).json({
      errorCode: 'user.update.picture.failed',
      message: 'Failed to delete profile picture. Please try again later.',
    });
  }
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
  const session = req.user;

  if (!username) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'No username provided.',
    });
    return;
  }

  const validateUsername = (username: string): boolean => {
    const usernameRegex = /^[a-zA-Z0-9\s_\u3040-\u30FF\u4E00-\u9FFF]{3,25}$/;
    return usernameRegex.test(username);
  };

  if (!validateUsername(username)) {
    res.status(400).send({
      errorCode: 'user.username.invalid',
      message:
        'Username must be between 3 and 25 characters long and contain only letters, numbers, spaces, underscores, or Japanese characters.',
    });
    return;
  }

  try {
    await User.update({ username }, { where: { id: session.id } });
    if (session) {
      session.username = username;
    }

    res.status(204).send({
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
        user: frontUserInfo(user.dataValues),
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

  if (req.user.username !== username) {
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

export const adminGetUsers = (req: Request, res: Response): void => {
  User.findAll()
    .then((users: User[] | null) => {
      res.send(users?.map((user) => frontUserInfo(user.dataValues, true)));
    })
    .catch(() => {
      res.status(500).send({
        errorCode: 'users.retrieving',
        message: `Error retrieving users`,
      });
    });
};

export const adminUpdateUser = async (req: Request, res: Response): Promise<void> => {
  const { id, username, email, isAdmin } = req.body;

  if (typeof isAdmin !== 'boolean') {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  try {
    await User.update({ username, email, isAdmin }, { where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).send({ errorCode: 'user.update', message: 'Failed to update User!' + error });
  }
};

export const adminSendPasswordEmail = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  User.findByPk(id)
    .then(async (user: User | null) => {
      if (!user) throw new Error('User not found');

      const to = user.dataValues.email;

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
          await User.update({ passwordToken: token }, { where: { id: user.id } });
          res.status(200).send();
        } catch (error: any) {
          console.error('Failed to send email:', error);
          res.status(500).send({ errorCode: 'errors.occured', message: 'Failed to send email.' });
          return;
        }
      }
    })
    .catch(() => {
      res.status(500).send({
        errorCode: 'user.not.found',
        message: `Error retrieving user with id=${id}`,
      });
    });
};

export const adminCreateUser = async (req: Request, res: Response): Promise<void> => {
  const { username, email, roomNumber, isAdmin } = req.body;

  if (!roomNumber || typeof isAdmin !== 'boolean') {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  try {
    const foundUser = await User.findAll({ where: { roomNumber } });

    if (foundUser) {
      res.status(500).send({ errorCode: 'user.room.number.already.exist', message: 'Failed to create User!' });
      return;
    }

    const user = await User.create({ username, email, roomNumber, isAdmin, password: 'PASSWORD_NOT_SET' });
    res.status(201).send(user);
  } catch (error: any) {
    res.status(500).send({ errorCode: 'user.create', message: 'Failed to create User!' + error });
  }
};

export const adminDeleteUser = async (req: Request, res: Response): Promise<void> => {
  if (!req.user.isAdmin) {
    res.status(400).send({
      errorCode: 'not.admin',
      message: 'You are not admin!',
    });
    return;
  }

  const { roomNumbers } = req.body;

  if (!roomNumbers) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  try {
    await User.destroy({
      where: {
        roomNumber: { [Op.in]: roomNumbers },
      },
    });
    res.status(200).send();
  } catch (error: any) {
    res.status(500).send({ errorCode: 'users.delete', message: 'Failed to delete User(s)!' + error });
  }
};
