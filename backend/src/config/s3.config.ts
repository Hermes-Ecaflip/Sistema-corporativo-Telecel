// =============================================================================
// TELECEL SYSTEM — config/s3.config.ts
// =============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
  bucket: process.env.AWS_S3_BUCKET || 'telecel-uploads',
  // URL pública dos arquivos
  publicUrl: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`,
  // Tamanho máximo de upload: 10MB
  maxFileSizeBytes: 10 * 1024 * 1024,
  // Tipos MIME permitidos
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
}));
