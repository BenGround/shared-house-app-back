import { Request, Response } from 'express';
import { SharedSpace } from './sharedspace.model';
import { getUrlImg } from '../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import { FrontSharedSpace, FrontSharedSpaceCreation } from '../../types/responses.type';
import {
  DATA_MISSING,
  SHAREDSPACE_DAY_TIME_INVALID,
  SHAREDSPACE_DESCRIPTIONS_INVALID,
  SHAREDSPACE_MAX_BOOKING_BY_USER_INVALID_LENGTH,
  SHAREDSPACE_MAX_BOOKING_HOURS_INVALID_LENGTH,
  SHAREDSPACE_NAMECODE_INVALID,
  SHAREDSPACE_NAMES_INVALID,
  SHAREDSPACE_START_END_DAY_TIME_INVALID,
} from '../../types/errorCodes.type';

export const frontShareSpaceInfo = (sharedSpace: SharedSpace): FrontSharedSpace => ({
  ...sharedSpace,
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

  const namesRegex = /^[a-zA-Z0-9\s_\u3040-\u30FF\u4E00-\u9FFF]{3,25}$/;
  const nameCodeRegex = /^[a-zA-Z0-9_]{3,25}$/;

  if (!nameCodeRegex.test(nameCode)) {
    sendErrorResponse(res, 400, SHAREDSPACE_NAMECODE_INVALID, 'Name code is invalid!');
    return false;
  }

  if (!namesRegex.test(nameEn) || !namesRegex.test(nameJp)) {
    sendErrorResponse(res, 400, SHAREDSPACE_NAMES_INVALID, 'Names are invalids!');
    return false;
  }

  if (
    (descriptionEn && (descriptionEn.length < 5 || descriptionEn.length > 300)) ||
    (descriptionJp && (descriptionJp.length < 5 || descriptionJp.length > 300))
  ) {
    sendErrorResponse(res, 400, SHAREDSPACE_DESCRIPTIONS_INVALID, 'Descriptions are invalids!');
    return false;
  }

  if (maxBookingHours < 1 || maxBookingHours > 24) {
    sendErrorResponse(
      res,
      400,
      SHAREDSPACE_MAX_BOOKING_HOURS_INVALID_LENGTH,
      'Invalid length for max booking hours attribute!',
    );
    return false;
  }

  if (maxBookingByUser < 1 || maxBookingByUser > 100) {
    sendErrorResponse(
      res,
      400,
      SHAREDSPACE_MAX_BOOKING_BY_USER_INVALID_LENGTH,
      'Invalid length for max booking by user attribute!',
    );
    return false;
  }

  const timeRegex = /^(?:[01]?\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(startDayTime) || !timeRegex.test(endDayTime)) {
    sendErrorResponse(res, 400, SHAREDSPACE_DAY_TIME_INVALID, 'Invalid length for max booking by user attribute!');
  }

  const [startHour, startMinute] = startDayTime.split(':').map(Number);
  const [endHour, endMinute] = endDayTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  if (startTotalMinutes >= endTotalMinutes) {
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
