import { Request, Response } from 'express';
import { SequelizeScopeError, where } from 'sequelize';
import { UserSession } from '../../types';
import { SharedSpace } from './sharedspace.model';

export const create = (req: Request<unknown, unknown, SharedSpace>, res: Response): void => {
  const { nameCode, startDayTime, endDayTime, maxBookingHours, maxBookingByUser, description } = req.body;

  if (!(req.session as UserSession).user?.isAdmin) {
    res.status(400).send({
      errorCode: 'not.admin',
      message: 'You are not admin!',
    });
    return;
  }

  if (!nameCode || !startDayTime || !endDayTime || !maxBookingHours || !maxBookingByUser) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  SharedSpace.findOne({ where: { nameCode } })
    .then((foundSharedSpace: SharedSpace | null) => {
      if (foundSharedSpace) {
        throw new Error('A use with this nameCode already exists!');
      }
    })
    .then(() => {
      new SharedSpace({
        nameCode,
        startDayTime,
        endDayTime,
        maxBookingHours,
        maxBookingByUser,
        description,
      }).save();
      res.status(201).send();
    })
    .catch((err: SequelizeScopeError) => {
      res.status(500).send({
        errorCode: 'sharespace.creation',
        message: err.message || 'Some error occurred while creating the shared space.',
      });
    });
};

export const list = (req: Request, res: Response): void => {
  SharedSpace.findAll()
    .then((sharedSpaces: SharedSpace[] | null) => {
      res.send(sharedSpaces);
    })
    .catch((error) => {
      res.status(500).send({
        errorCode: 'sharedspace',
        message: 'Error retrieving shared spaces',
        error: error,
      });
    });
};

export const destroy = (req: Request, res: Response): void => {
  const { id } = req.params;

  SharedSpace.destroy({ where: { id } })
    .then(() => {
      res.status(204).send();
    })
    .catch((error: any) => {
      res.status(500).send({
        errorCode: 'sharedspace',
        message: 'Error retrieving shared spaces ' + error.message,
      });
    });
};

export const findById = (req: Request, res: Response): void => {
  SharedSpace.findOne({ where: { id: req.params.id } })
    .then((sharedSpace: SharedSpace | null) => {
      res.send(sharedSpace);
    })
    .catch(() => {
      res.status(500).send({
        errorCode: 'sharedspace',
        message: 'Error retrieving shared spaces',
      });
    });
};
