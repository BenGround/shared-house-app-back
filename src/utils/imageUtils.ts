import dotenv from 'dotenv';
import multer from 'multer';
import { Request } from 'express';
import { getMinioClient } from './minioClient';

dotenv.config();

export function getUrlImg(profilePicture: String | undefined): String | null {
  const minioUrl = process.env.MINIO_URL;
  const bucketName = process.env.MINIO_BUCKET;

  return minioUrl && profilePicture && bucketName ? `${minioUrl}/${bucketName}/${profilePicture}` : null;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only PNG, JPEG, and GIF are allowed.'));
    } else {
      cb(null, true);
    }
  },
});

export const uploadFileToMinio = async (
  file: Express.Multer.File,
  bucketName: string,
  uniqueToken: string,
): Promise<string> => {
  const fileExtension = file.originalname.split('.').pop();
  const objectName = `users/${uniqueToken}.${fileExtension}`;

  try {
    await getMinioClient().putObject(bucketName, objectName, file.buffer, file.size);
    return objectName;
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Error uploading file: ${error.message}`);
  }
};

export const removeFileToMinio = async (bucketName: string, picture: string): Promise<void> => {
  try {
    await getMinioClient().removeObject(bucketName, picture);
  } catch (err: unknown) {
    const error = err as Error;
    throw new Error(`Error deleting file: ${error.message}`);
  }
};
