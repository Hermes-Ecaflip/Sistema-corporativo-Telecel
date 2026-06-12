// =============================================================================
// TELECEL SYSTEM — stores/stores.controller.ts
// =============================================================================

import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto, QueryStoreDto } from './dto/store.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('stores')
@ApiBearerAuth('access-token')
@Controller({ path: 'stores', version: '1' })
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar loja (somente admin)' })
  create(
    @Body() dto: CreateStoreDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.storesService.create(dto, companyId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar lojas (com contagem de funcionários)' })
  findAll(@Query() query: QueryStoreDto, @CurrentUser('companyId') companyId: string) {
    return this.storesService.findAll(companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe da loja com funcionários' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('companyId') companyId: string) {
    return this.storesService.findOne(id, companyId);
  }

  @Get(':id/monitoring')
  @ApiOperation({ summary: 'Monitoramento da loja: vendas, funcionários, estoque, meta do mês' })
  monitoring(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('month') month: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.storesService.getStoreMonitoring(id, companyId, month);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.GERENTE)
  @ApiOperation({ summary: 'Atualizar loja' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.storesService.update(id, dto, companyId, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desativar loja (soft delete)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.storesService.remove(id, companyId, userId);
  }
}
