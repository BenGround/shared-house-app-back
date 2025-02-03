import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { SharedSpace } from './sharedspace.model';
import { removeFileToMinio, upload, uploadFileToMinio } from '../../utils/imageUtils';
import { getMinioClient } from '../../utils/minioClient';
import { getUrlImg } from '../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import { frontShareSpaceInfo, validateSharedSpaceFields } from './sharedSpace.helper';

export const adminCreateSharedspace = async (
  req: Request<unknown, unknown, SharedSpace>,
  res: Response,
): Promise<void> => {
  if (!validateSharedSpaceFields(req, res)) return;

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

  try {
    const existingSpace = await SharedSpace.findOne({ where: { nameCode } });
    if (existingSpace) {
      return sendErrorResponse(res, 400, 'data.conflict', 'A shared space with this nameCode already exists!');
    }

    const newSpace = await SharedSpace.create({
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

    res.status(201).send(frontShareSpaceInfo(newSpace.dataValues));
  } catch (error: any) {
    return sendErrorResponse(res, 500, 'sharespace.creation', `Error creating shared space: ${error.message}`);
  }
};

export const adminUpdateSharedspace = async (
  req: Request<unknown, unknown, SharedSpace>,
  res: Response,
): Promise<void> => {
  if (!validateSharedSpaceFields(req, res)) return;

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

  try {
    const spaceToUpdate = await SharedSpace.findOne({ where: { nameCode } });
    if (!spaceToUpdate) {
      return sendErrorResponse(res, 404, 'sharespace.not.found', 'Shared space not found!');
    }

    await SharedSpace.update(
      {
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
    return sendErrorResponse(res, 500, 'sharespace.update', `Error updating shared space: ${error.message}`);
  }
};

export const list = async (req: Request, res: Response): Promise<void> => {
  try {
    const sharedSpaces = await SharedSpace.findAll({ order: [['nameCode', 'ASC']] });
    if (!sharedSpaces) {
      return sendErrorResponse(res, 404, 'sharedspace', 'No shared spaces found!');
    }

    res.send(sharedSpaces.map((space) => frontShareSpaceInfo(space.dataValues)));
  } catch (error) {
    return sendErrorResponse(res, 500, 'sharedspace.list', 'Error retrieving shared spaces');
  }
};

export const adminDeleteSharedspaces = async (req: Request, res: Response): Promise<void> => {
  const { nameCodes } = req.body;

  if (!nameCodes) {
    return sendErrorResponse(res, 400, 'data.missing', 'Missing id param!');
  }

  try {
    await SharedSpace.destroy({ where: { nameCode: { [Op.in]: nameCodes } } });
    res.status(204).send();
  } catch (error) {
    return sendErrorResponse(res, 500, 'sharedspace.delete', 'Error deleting shared spaces');
  }
};

export const findById = async (req: Request, res: Response): Promise<void> => {
  try {
    const sharedSpace = await SharedSpace.findOne({ where: { id: req.params.id } });
    if (!sharedSpace) {
      return sendErrorResponse(res, 404, 'sharedspace.not.found', 'Shared space not found!');
    }

    res.send(frontShareSpaceInfo(sharedSpace));
  } catch (error) {
    return sendErrorResponse(res, 500, 'sharedspace.find', 'Error retrieving shared space');
  }
};

export const adminUploadPicture = upload.single('picture');
export const adminUploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const sharedSpace = await SharedSpace.findOne({ where: { id: req.params.id } });
    if (!sharedSpace) throw new Error('Shared space not found');

    const { id, nameCode, picture } = sharedSpace.dataValues;
    const bucketName = process.env.MINIO_BUCKET;
    const file = req.file;

    if (!file) return sendErrorResponse(res, 400, 'file.missing', 'No file uploaded');
    if (!bucketName) return sendErrorResponse(res, 500, 'errors.occured', 'Bucket not configured');

    if (picture) {
      await removeFileToMinio(bucketName, picture);
    }

    const objectName = await uploadFileToMinio(file, bucketName, nameCode);

    await SharedSpace.update({ picture: objectName }, { where: { id } });
    res.status(200).send({ message: 'Picture updated successfully.', picture: getUrlImg(objectName) });
  } catch (error) {
    return sendErrorResponse(res, 500, 'sharedspace.update.picture.failed', 'Failed to update profile picture.');
  }
};

export const adminDeletePicture = async (req: Request, res: Response): Promise<void> => {
  try {
    const sharedSpace = await SharedSpace.findOne({ where: { id: req.params.id } });
    if (!sharedSpace) throw new Error('Shared space not found');

    const { id, picture } = sharedSpace.dataValues;
    const bucketName = process.env.MINIO_BUCKET;

    if (!picture) {
      return sendErrorResponse(res, 500, 'sharedspace.picture.not_found', 'No picture to delete');
    }

    if (!bucketName) return sendErrorResponse(res, 500, 'errors.occured', 'Bucket not configured');

    await getMinioClient().removeObject(bucketName, picture);
    await SharedSpace.update({ picture: null }, { where: { id } });

    res.status(204).json({ message: 'Picture deleted successfully.' });
  } catch (error) {
    return sendErrorResponse(res, 500, 'sharedspace.update.picture.failed', 'Failed to delete profile picture.');
  }
};
