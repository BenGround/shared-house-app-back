import { Request, Response } from 'express';
import { SharedSpace } from './sharedspace.model';
import { getUrlImg } from '../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';

export const frontShareSpaceInfo = (sharedSpace: SharedSpace | null) =>
  sharedSpace
    ? {
        ...sharedSpace,
        picture: sharedSpace.picture ? getUrlImg(sharedSpace.picture) : null,
      }
    : null;

export const validateSharedSpaceFields = (req: Request<unknown, unknown, SharedSpace>, res: Response): boolean => {
  const { nameCode, nameEn, nameJp, startDayTime, endDayTime, maxBookingHours, maxBookingByUser } = req.body;

  if (!nameCode || !nameEn || !nameJp || !startDayTime || !endDayTime || !maxBookingHours || !maxBookingByUser) {
    sendErrorResponse(res, 400, 'data.missing', 'Missing required fields!');
    return false;
  }

  return true;
};
