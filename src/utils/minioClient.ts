import * as Minio from 'minio';
import dotenv from 'dotenv';

dotenv.config();

let minioClient: Minio.Client | null = null;

const createMinioClient = (): Minio.Client => {
  if (!process.env.MINIO_URL || !process.env.MINIO_USER || !process.env.MINIO_PASSWORD) {
    throw new Error('Missing MinIO environment variables.');
  }

  try {
    const url = new URL(process.env.MINIO_URL);

    minioClient = new Minio.Client({
      endPoint: url.hostname,
      port: url.port ? parseInt(url.port) : undefined,
      useSSL: url.protocol === 'https:',
      accessKey: process.env.MINIO_USER,
      secretKey: process.env.MINIO_PASSWORD,
    });

    console.log('✅ MinIO client initialized successfully.');
    return minioClient;
  } catch (error) {
    console.error('❌ Failed to initialize MinIO client:', error);
    throw error;
  }
};

export const getMinioClient = (): Minio.Client => {
  if (!minioClient) {
    minioClient = createMinioClient();
  }
  return minioClient;
};
