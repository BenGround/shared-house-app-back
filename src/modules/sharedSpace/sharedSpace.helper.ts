import { Request, Response } from 'express';
import { SharedSpace } from './sharedspace.model';
import { getUrlImg } from '../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import { FrontSharedSpace } from '../../types/responses.type';
import { DATA_MISSING } from '../../types/errorCodes.type';

export const frontShareSpaceInfo = (sharedSpace: SharedSpace): FrontSharedSpace => ({
  ...sharedSpace,
  picture: getUrlImg(sharedSpace.picture),
});

export const validateSharedSpaceFields = (req: Request<{}, {}, FrontSharedSpace>, res: Response): boolean => {
  const { nameCode, nameEn, nameJp, startDayTime, endDayTime, maxBookingHours, maxBookingByUser } = req.body;

  if (!nameCode || !nameEn || !nameJp || !startDayTime || !endDayTime || !maxBookingHours || !maxBookingByUser) {
    sendErrorResponse(res, 400, DATA_MISSING, 'Missing required fields!');
    return false;
  }

  return true;
};
