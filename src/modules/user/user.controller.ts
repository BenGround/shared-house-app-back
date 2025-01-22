import { hash } from 'bcrypt';
import { Request, Response } from 'express';
import { Op, SequelizeScopeError } from 'sequelize';
import { UserSession } from '../../types';
import { User } from './user.model';

export const register = (req: Request<unknown, unknown, User>, res: Response): void => {
  const { username, roomNumber } = req.body;

  if (!username || !roomNumber || !req.body.password || !req.body.email) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  User.findOne({
    where: {
      [Op.or]: [{ username }, { roomNumber }],
    },
  })
    .then((foundUser: User | null) => {
      if (foundUser) {
        throw new Error('An user already exists! Try to log in or chose another username or room number.');
      }
    })
    .then(() => hash(req.body.password, 8))
    .then(
      (password: string) =>
        new User({
          username,
          roomNumber,
          password,
          email: req.body.email,
          isAdmin: req.body.isAdmin,
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
          username: user.username,
          email: user.email,
          roomNumber: user.roomNumber,
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

  if ((req.session as UserSession).user?.username !== username) {
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
