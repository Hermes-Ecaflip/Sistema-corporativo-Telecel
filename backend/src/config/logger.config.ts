// =============================================================================
// TELECEL SYSTEM — config/logger.config.ts
// Winston logger com rotação diária e formatação estruturada
// =============================================================================

import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Formato legível para console (desenvolvimento)
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, context, stack }) => {
    const ctx = context ? ` [${context}]` : '';
    const err = stack ? `\n${stack}` : '';
    return `${timestamp} ${level}${ctx}: ${message}${err}`;
  }),
);

// Formato JSON estruturado para arquivos (produção)
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

export const WinstonLogger = WinstonModule.createLogger({
  transports: [
    // Console — sempre ativo
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    }),

    // Arquivo de logs gerais — rotação diária
    new (winston.transports as any).DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,         // Comprime logs antigos
      maxSize: '20m',              // Máximo por arquivo
      maxFiles: '30d',             // Manter por 30 dias
      format: fileFormat,
      level: 'info',
    }),

    // Arquivo de erros separado
    new (winston.transports as any).DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '90d',             // Erros mantidos por 90 dias
      format: fileFormat,
      level: 'error',
    }),
  ],

  // Não encerrar o processo em exceções não tratadas
  exitOnError: false,
});
