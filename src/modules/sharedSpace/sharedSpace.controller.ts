import { Request, Response } from 'express';
import { SharedSpace } from './sharedspace.model';
import { sendErrorResponse } from '../../utils/errorUtils';
import { frontShareSpaceInfo } from './sharedSpace.helper';
import { ApiResponse, FrontSharedSpace, SHAREDSPACE_LIST } from '@benhart44/shared-house-shared';

/**
 * @swagger
 * tags:
 *   name: SharedSpaces
 *   description: The shared spaces managing API
 */

/**
 * @swagger
 * /sharedspace/list:
 *   get:
 *     tags: [SharedSpaces]
 *     summary: List all shared spaces
 *     description: Retrieves a list of all shared spaces ordered by name code in ascending order.
 *     responses:
 *       200:
 *         description: A list of shared spaces
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/FrontSharedSpace"
 *       404:
 *         description: No shared spaces found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 *       500:
 *         description: Internal error occurred while retrieving shared spaces
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiResponse"
 */
export const list = async (req: Request, res: Response<ApiResponse<FrontSharedSpace[]>>): Promise<void> => {
  try {
    const sharedSpaces = await SharedSpace.findAll({ order: [['nameCode', 'ASC']] });
    if (!sharedSpaces) {
      return sendErrorResponse(res, 404, SHAREDSPACE_LIST, 'No shared spaces found!');
    }

    res.send({ data: sharedSpaces.map((space) => frontShareSpaceInfo(space.dataValues)) });
  } catch (error) {
    return sendErrorResponse(res, 500, SHAREDSPACE_LIST, 'Error retrieving shared spaces');
  }
};
