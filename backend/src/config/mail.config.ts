// =============================================================================
// TELECEL SYSTEM — config/mail.config.ts
// =============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587', 10),
  secure: process.env.MAIL_PORT === '465',  // true para porta 465 (SSL)
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
  from: process.env.MAIL_FROM || 'noreply@telecel.com.br',
  fromName: process.env.MAIL_FROM_NAME || 'TELECEL System',
}));
