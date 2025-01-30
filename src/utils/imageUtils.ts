import dotenv from 'dotenv';
dotenv.config();
export function getUrlImg(profilePicture: String | undefined): String | null {
  const minioUrl = process.env.MINIO_URL;
  const bucketName = process.env.MINIO_BUCKET;

  return minioUrl && profilePicture && bucketName ? `${minioUrl}/${bucketName}/${profilePicture}` : null;
}
