import { Request, Response } from 'express';
import { Op, SequelizeScopeError, where } from 'sequelize';
import { SharedSpace } from './sharedspace.model';

export const adminCreateSharedspace = (req: Request<unknown, unknown, SharedSpace>, res: Response): void => {
  const {
    nameCode,
    nameEn,
    nameJp,
    startDayTime,
    endDayTime,
    maxBookingHours,
    maxBookingByUser,
    descriptionEn,
    descriptionJp,
  } = req.body;

  if (!nameCode || !nameEn || !nameJp || !startDayTime || !endDayTime || !maxBookingHours || !maxBookingByUser) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  SharedSpace.findOne({ where: { nameCode } })
    .then((foundSharedSpace: SharedSpace | null) => {
      if (foundSharedSpace) {
        throw new Error('A shared space with this nameCode already exists!');
      }
    })
    .then(() => {
      const sharespace = new SharedSpace({
        nameCode,
        nameEn,
        nameJp,
        startDayTime,
        endDayTime,
        maxBookingHours,
        maxBookingByUser,
        descriptionEn,
        descriptionJp,
      });

      sharespace.save();

      res.status(201).send(sharespace);
    })
    .catch((err: SequelizeScopeError) => {
      res.status(500).send({
        errorCode: 'sharespace.creation',
        message: err.message || 'Some error occurred while creating the shared space.',
      });
    });
};

export const adminUpdateSharedspace = async (
  req: Request<unknown, unknown, SharedSpace>,
  res: Response,
): Promise<void> => {
  const {
    nameCode,
    nameEn,
    nameJp,
    startDayTime,
    endDayTime,
    maxBookingHours,
    maxBookingByUser,
    descriptionEn,
    descriptionJp,
  } = req.body;

  if (!nameCode || !nameEn || !nameJp || !startDayTime || !endDayTime || !maxBookingHours || !maxBookingByUser) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  try {
    await SharedSpace.update(
      {
        nameCode,
        nameEn,
        nameJp,
        startDayTime,
        endDayTime,
        maxBookingHours,
        maxBookingByUser,
        descriptionEn,
        descriptionJp,
      },
      { where: { nameCode } },
    );
    res.status(204).send();
  } catch (error: any) {
    res.status(500).send({
      errorCode: 'sharespace.creation',
      message: error.message || 'Some error occurred while updating the shared space.',
    });
  }
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

export const adminDeleteSharedspaces = (req: Request, res: Response): void => {
  const { nameCodes } = req.body;

  if (!nameCodes) {
    res.status(400).send({
      errorCode: 'data.missing',
      message: 'Missing data!',
    });
    return;
  }

  SharedSpace.destroy({ where: { nameCode: { [Op.in]: nameCodes } } })
    .then(() => {
      res.status(204).send();
    })
    .catch((error: any) => {
      res.status(500).send({
        errorCode: 'sharedspace',
        message: 'Error deleting shared spaces ' + error.message,
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
        message: 'Error retrieving shared space',
      });
    });
};
