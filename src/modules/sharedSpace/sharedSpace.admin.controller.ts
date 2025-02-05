import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { SharedSpace } from './sharedspace.model';
import { removeFileToMinio, upload, uploadFileToMinio } from '../../utils/imageUtils';
import { getMinioClient } from '../../utils/minioClient';
import { getUrlImg } from '../../utils/imageUtils';
import { sendErrorResponse } from '../../utils/errorUtils';
import { frontShareSpaceInfo, validateSharedSpaceFields } from './sharedSpace.helper';
import {
  DATA_CONFLICT,
  DATA_MISSING,
  ERRORS_OCCURED,
  FILE_MISSING,
  SHAREDSPACE_CREATION,
  SHAREDSPACE_DELETE,
  SHAREDSPACE_NOT_FOUND,
  SHAREDSPACE_PICTURE_NOT_FOUND,
  SHAREDSPACE_UPDATE,
  SHAREDSPACE_UPDATE_PICTURE_FAILED,
  ApiResponse,
  FrontSharedSpace,
  FrontSharedSpaceCreation,
} from '@benhart44/shared-house-shared';

/**
 * @swagger
 * tags:
 *   name: SharedSpaces - Admin
 *   description: The shared spaces managing API for admin
 */

/**
 * @swagger
 * /admin/sharedspace:
 *   post:
 *     tags: [SharedSpaces - Admin]
 *     summary: Create a new shared space
 *     description: Create a new shared space with the provided details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FrontSharedSpaceCreation'
 *     responses:
 *       201:
 *         description: Successfully created a new shared space
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: "#/components/schemas/FrontSharedSpace"
 *       400:
 *         description: A shared space with the provided nameCode already exists. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error occurred during creation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
export const adminCreateSharedspace = async (
  req: Request<{}, {}, FrontSharedSpaceCreation>,
  res: Response<ApiResponse<FrontSharedSpace>>,
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
      return sendErrorResponse(res, 400, DATA_CONFLICT, 'A shared space with this nameCode already exists!');
    }

    const newSpace = await SharedSpace.create({
      nameCode: nameCode.trim(),
      nameEn: nameEn.trim(),
      nameJp: nameJp.trim(),
      startDayTime,
      endDayTime,
      maxBookingHours,
      maxBookingByUser,
      descriptionEn: descriptionEn?.trim(),
      descriptionJp: descriptionJp?.trim(),
    });

    if (!newSpace) {
      return sendErrorResponse(res, 500, SHAREDSPACE_CREATION, 'Failed to create new shared space');
    }

    res.status(201).send({ data: frontShareSpaceInfo(newSpace.dataValues) });
  } catch (error: any) {
    return sendErrorResponse(res, 500, SHAREDSPACE_CREATION, `Error creating shared space: ${error.message}`);
  }
};

/**
 * @swagger
 * /admin/sharedspace:
 *   put:
 *     tags: [SharedSpaces - Admin]
 *     summary: Update an existing shared space
 *     description: Update the details of an existing shared space, including name, booking limits, and description.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FrontSharedSpace'
 *     responses:
 *       204:
 *         description: Shared space updated successfully
 *       400:
 *         description: Bad request due to invalid input or missing fields. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       404:
 *         description: Shared space not found with the provided nameCode
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error or failure in updating shared space
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
export const adminUpdateSharedspace = async (
  req: Request<{}, {}, FrontSharedSpace>,
  res: Response<ApiResponse>,
): Promise<void> => {
  if (!validateSharedSpaceFields(req, res)) return;

  const {
    id,
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
    const spaceToUpdate = await SharedSpace.findOne({ where: { id } });
    if (!spaceToUpdate) {
      return sendErrorResponse(res, 404, SHAREDSPACE_NOT_FOUND, 'Shared space not found!');
    }

    await SharedSpace.update(
      {
        nameCode: nameCode.trim(),
        nameEn: nameEn.trim(),
        nameJp: nameJp.trim(),
        startDayTime,
        endDayTime,
        maxBookingHours,
        maxBookingByUser,
        descriptionEn: descriptionEn?.trim(),
        descriptionJp: descriptionJp?.trim(),
      },
      { where: { id } },
    );

    res.status(204).send();
  } catch (error: any) {
    return sendErrorResponse(res, 500, SHAREDSPACE_UPDATE, `Error updating shared space: ${error.message}`);
  }
};

/**
 * @swagger
 * /admin/sharedspace:
 *   delete:
 *     tags: [SharedSpaces]
 *     summary: Delete multiple shared spaces
 *     description: Deletes shared spaces based on the provided nameCodes. Deletes spaces in bulk if their nameCode is listed.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nameCodes:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: List of nameCodes of the shared spaces to delete
 *     responses:
 *       204:
 *         description: Shared spaces successfully deleted
 *       400:
 *         description: Bad request. Missing nameCodes parameter or invalid data. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Error deleting the shared spaces
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const adminDeleteSharedspaces = async (
  req: Request<{}, {}, { nameCodes: number[] }>,
  res: Response<ApiResponse>,
): Promise<void> => {
  const { nameCodes } = req.body;

  if (!nameCodes) {
    return sendErrorResponse(res, 400, DATA_MISSING, 'Missing id param!');
  }

  try {
    await SharedSpace.destroy({ where: { nameCode: { [Op.in]: nameCodes } } });
    res.status(204).send();
  } catch (error) {
    return sendErrorResponse(res, 500, SHAREDSPACE_DELETE, 'Error deleting shared spaces');
  }
};

/**
 * @swagger
 * /admin/sharedspace/update/picture/{id}:
 *   put:
 *     tags: [SharedSpaces - Admin]
 *     summary: Upload or update image for a shared space
 *     description: Upload an image and associate it with a shared space. If an image already exists, it will be replaced.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the shared space to which the image will be uploaded.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload
 *     responses:
 *       200:
 *         description: Image successfully uploaded and associated with the shared space
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: "#/components/schemas/ApiResponse"
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: string
 *                       description: The URL of the uploaded image
 *       400:
 *         description: Invalid or missing parameters, file missing, or shared space ID not found. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error or failure in file upload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
export const adminUploadPicture = upload.single('picture');
export const adminUploadImage = async (
  req: Request<{ id: string }> & { file?: Express.Multer.File },
  res: Response<ApiResponse<string>>,
): Promise<void> => {
  try {
    const parsedId = parseInt(req.params.id, 10);

    if (isNaN(parsedId)) {
      return sendErrorResponse(res, 400, ERRORS_OCCURED, 'Invalid shared space ID!');
    }

    const sharedSpace = await SharedSpace.findOne({ where: { id: parsedId } });
    if (!sharedSpace) throw new Error('Shared space not found');

    const { id, nameCode, picture } = sharedSpace.dataValues;
    const bucketName = process.env.MINIO_BUCKET;
    const file = req.file;

    if (!file) return sendErrorResponse(res, 400, FILE_MISSING, 'No file uploaded');
    if (!bucketName) return sendErrorResponse(res, 500, ERRORS_OCCURED, 'Bucket not configured');

    if (picture) {
      await removeFileToMinio(bucketName, picture);
    }

    const objectName = await uploadFileToMinio(file, bucketName, nameCode);

    await SharedSpace.update({ picture: objectName }, { where: { id } });
    res.status(200).send({ message: 'Picture updated successfully.', data: getUrlImg(objectName) });
  } catch (error) {
    return sendErrorResponse(res, 500, SHAREDSPACE_UPDATE_PICTURE_FAILED, 'Failed to update picture.');
  }
};

/**
 * @swagger
 * /admin/sharedspace/delete/picture/{id}:
 *   delete:
 *     tags: [SharedSpaces - Admin]
 *     summary: Delete picture associated with a shared space
 *     description: Delete the picture associated with a specific shared space. If no picture exists, returns an error.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: The ID of the shared space whose picture will be deleted.
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Picture successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       400:
 *         description: Invalid shared space ID or no picture to delete. User not logged or activated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         description: User is not admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       500:
 *         description: Internal server error or failure in deletion process
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
export const adminDeletePicture = async (req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<void> => {
  try {
    const sharedSpace = await SharedSpace.findOne({ where: { id: req.params.id } });
    if (!sharedSpace) throw new Error('Shared space not found');

    const { id, picture } = sharedSpace.dataValues;
    const bucketName = process.env.MINIO_BUCKET;

    if (!picture) {
      return sendErrorResponse(res, 500, SHAREDSPACE_PICTURE_NOT_FOUND, 'No picture to delete');
    }

    if (!bucketName) return sendErrorResponse(res, 500, ERRORS_OCCURED, 'Bucket not configured');

    await getMinioClient().removeObject(bucketName, picture);
    await SharedSpace.update({ picture: null }, { where: { id } });

    res.status(204).json({ message: 'Picture deleted successfully.' });
  } catch (error) {
    return sendErrorResponse(res, 500, SHAREDSPACE_UPDATE_PICTURE_FAILED, 'Failed to delete profile picture.');
  }
};
