import { Request, Response } from 'express';
import { SharedSpace } from './sharedspace.model';
import { getUrlImg } from '../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import {
  DATA_MISSING,
  SHAREDSPACE_DAY_TIME_INVALID,
  SHAREDSPACE_DESCRIPTIONS_INVALID,
  SHAREDSPACE_MAX_BOOKING_BY_USER_INVALID_LENGTH,
  SHAREDSPACE_MAX_BOOKING_HOURS_INVALID_LENGTH,
  SHAREDSPACE_NAMECODE_INVALID,
  SHAREDSPACE_NAMES_INVALID,
  SHAREDSPACE_START_END_DAY_TIME_INVALID,
  FrontSharedSpace,
  FrontSharedSpaceCreation,
  validateNameCode,
  validateName,
  validateDescription,
  validateMaxBookingHours,
  validateMaxBookingByUser,
  validateFormatDayTime,
  isStartDayTimeAfterEndDayTime,
} from '@benhart44/shared-house-shared';

export const frontShareSpaceInfo = (sharedSpace: SharedSpace): FrontSharedSpace => ({
  ...sharedSpace,
  id: sharedSpace.id,
  startDayTime: formatSharedSpaceDayTime(sharedSpace.startDayTime),
  endDayTime: formatSharedSpaceDayTime(sharedSpace.endDayTime),
  picture: getUrlImg(sharedSpace.picture),
});

export const validateSharedSpaceFields = (
  req: Request<{}, {}, FrontSharedSpace | FrontSharedSpaceCreation>,
  res: Response,
): boolean => {
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
    sendErrorResponse(res, 400, DATA_MISSING, 'Missing required fields!');
    return false;
  }

  if (!validateNameCode(nameCode)) {
    sendErrorResponse(res, 400, SHAREDSPACE_NAMECODE_INVALID, 'Name code is invalid!');
    return false;
  }

  if (!(validateName(nameEn) && validateName(nameJp))) {
    sendErrorResponse(res, 400, SHAREDSPACE_NAMES_INVALID, 'Names are invalids!');
    return false;
  }

  if (!(validateDescription(descriptionEn) && validateDescription(descriptionJp))) {
    sendErrorResponse(res, 400, SHAREDSPACE_DESCRIPTIONS_INVALID, 'Descriptions are invalids!');
    return false;
  }

  if (!validateMaxBookingHours(maxBookingHours)) {
    sendErrorResponse(
      res,
      400,
      SHAREDSPACE_MAX_BOOKING_HOURS_INVALID_LENGTH,
      'Invalid length for max booking hours attribute!',
    );
    return false;
  }

  if (!validateMaxBookingByUser(maxBookingByUser)) {
    sendErrorResponse(
      res,
      400,
      SHAREDSPACE_MAX_BOOKING_BY_USER_INVALID_LENGTH,
      'Invalid length for max booking by user attribute!',
    );
    return false;
  }

  if (!(validateFormatDayTime(startDayTime) && validateFormatDayTime(endDayTime))) {
    sendErrorResponse(res, 400, SHAREDSPACE_DAY_TIME_INVALID, 'Invalid length for max booking by user attribute!');
  }

  if (isStartDayTimeAfterEndDayTime(startDayTime, endDayTime)) {
    sendErrorResponse(res, 400, SHAREDSPACE_START_END_DAY_TIME_INVALID, 'Start day time is after end day time!');
  }

  return true;
};

const formatSharedSpaceDayTime = (dayTime: string): string => {
  if (!dayTime) {
    return '';
  }

  const [hours, minutes] = dayTime.split(':');

  if (!hours || !minutes) {
    return '';
  }

  return `${parseInt(hours, 10)}:${minutes}`;
};
