// =============================================================================
// TELECEL SYSTEM — users/users.controller.ts
// Controller de Usuários: CRUD, avatar, status, CSV, estatísticas
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto,
  UserResponseDto,
  UpdateUserStatusDto,
} from './dto/user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiPaginatedResponse } from '../common/decorators/index';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── CRIAR USUÁRIO ───────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário [ADMIN]' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiResponse({ status: 409, description: 'E-mail ou CPF já cadastrado' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.create(dto, companyId, userId);
  }

  // ─── LISTAR USUÁRIOS ─────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Listar usuários com filtros e paginação' })
  @ApiPaginatedResponse(UserResponseDto)
  findAll(
    @Query() query: QueryUserDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.findAll(companyId, query);
  }

  // ─── ESTATÍSTICAS ────────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Estatísticas de usuários por papel e status' })
  getStats(@CurrentUser('companyId') companyId: string) {
    return this.usersService.getStats(companyId);
  }

  // ─── EXPORTAR CSV ────────────────────────────────────────────────────────

  @Get('export/csv')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Exportar lista de usuários em CSV [ADMIN]' })
  @ApiResponse({ status: 200, description: 'Arquivo CSV retornado' })
  async exportCsv(
    @Query() query: QueryUserDto,
    @CurrentUser('companyId') companyId: string,
    @Res() res: Response,
  ) {
    const csv = await this.usersService.exportCsv(companyId, query);

    const filename = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  // ─── MEU PERFIL ──────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Retornar perfil do usuário autenticado' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  getMe(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.findOne(userId, companyId);
  }

  // ─── BUSCAR POR ID ───────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.usersService.findOne(id, companyId);
  }

  // ─── ATUALIZAR DADOS ─────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Atualizar dados do usuário [ADMIN, SUPERVISOR]' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.usersService.update(id, companyId, dto, userId);
  }

  // ─── ATUALIZAR PRÓPRIO PERFIL ────────────────────────────────────────────

  @Patch('me/profile')
  @ApiOperation({ summary: 'Atualizar próprio perfil' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('companyId') companyId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, companyId, dto, userId);
  }

  // ─── UPLOAD DE AVATAR ────────────────────────────────────────────────────

  @Post(':id/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de avatar do usuário (JPEG/PNG, máx. 2MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'URL do avatar retornada' })
  uploadAvatar(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(id, companyId, file);
  }

  // ─── ALTERAR STATUS ──────────────────────────────────────────────────────

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Alterar status do usuário [ADMIN]' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.usersService.updateStatus(id, companyId, dto, userId, role);
  }

  // ─── EXCLUIR (SOFT DELETE) ───────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover usuário (soft delete) [ADMIN]' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.usersService.remove(id, companyId, userId, role);
  }
}
