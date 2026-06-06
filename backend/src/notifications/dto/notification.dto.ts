// =============================================================================
// TELECEL SYSTEM — notifications/dto/notification.dto.ts
// DTOs de Notificações: filtros, marcar como lida e resposta
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsEnum, IsOptional, IsBoolean, IsInt,
  Min, Max, IsArray, ArrayMinSize, IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { NotificationType } from '@prisma/client';

// =============================================================================
// QUERY / FILTROS
// =============================================================================
export class QueryNotificationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar apenas não lidas' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  unreadOnly?: boolean;

  @ApiPropertyOptional({ enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}

// =============================================================================
// MARCAR COMO LIDA (em lote)
// =============================================================================
export class MarkReadDto {
  @ApiProperty({ type: [String], description: 'UUIDs das notificações' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  notificationIds: string[];
}

// =============================================================================
// RESPOSTA
// =============================================================================
export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: NotificationType }) type: NotificationType;
  @ApiProperty() title: string;
  @ApiProperty() message: string;
  @ApiProperty() read: boolean;
  @ApiPropertyOptional() link?: string;
  @ApiPropertyOptional() metadata?: Record<string, any>;
  @ApiProperty() userId: string;
  @ApiPropertyOptional() readAt?: Date;
  @ApiProperty() createdAt: Date;
}
