// =============================================================================
// TELECEL SYSTEM — products/products.controller.ts
// Controller de Produtos: CRUD, busca por código, status, estatísticas
// =============================================================================

import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  ProductResponseDto,
  UpdateProductStatusDto,
} from './dto/product.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiPaginatedResponse } from '../common/decorators/index';

@ApiTags('products')
@ApiBearerAuth('access-token')
@Controller({ path: 'products', version: '1' })
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ─── CRIAR ─────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Cadastrar produto/plano TIM [ADMIN, SUPERVISOR]' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({ status: 409, description: 'Código já cadastrado' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.create(dto, companyId, userId);
  }

  // ─── LISTAR ────────────────────────────────────────────────────────────

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Listar produtos com filtros',
    description: 'Filtros: busca textual, categoria, status, faixa de preço.',
  })
  @ApiPaginatedResponse(ProductResponseDto)
  findAll(
    @Query() query: QueryProductDto,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.productsService.findAll(companyId, query);
  }

  // ─── ESTATÍSTICAS ──────────────────────────────────────────────────────

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Estatísticas do catálogo (categorias, preços)' })
  getStats(@CurrentUser('companyId') companyId: string) {
    return this.productsService.getStats(companyId);
  }

  // ─── BUSCAR POR CÓDIGO ─────────────────────────────────────────────────

  @Get('code/:code')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR)
  @ApiOperation({ summary: 'Buscar produto por código' })
  @ApiParam({ name: 'code', example: 'TIM-BLACK-50' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  findByCode(
    @Param('code') code: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.productsService.findByCode(code, companyId);
  }

  // ─── BUSCAR POR ID ─────────────────────────────────────────────────────

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.VENDEDOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    return this.productsService.findOne(id, companyId);
  }

  // ─── ATUALIZAR ─────────────────────────────────────────────────────────

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Atualizar produto [ADMIN, SUPERVISOR]' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.update(id, companyId, dto, userId);
  }

  // ─── ALTERAR STATUS ────────────────────────────────────────────────────

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Ativar/Inativar/Descontinuar produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductStatusDto,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.updateStatus(id, companyId, dto, userId);
  }

  // ─── EXCLUIR ───────────────────────────────────────────────────────────

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover produto (soft delete) [ADMIN]',
    description: 'Produtos com vendas vinculadas não podem ser removidos — inative-os.',
  })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 200, description: 'Produto removido' })
  @ApiResponse({ status: 400, description: 'Produto possui vendas vinculadas' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.remove(id, companyId, userId);
  }
}
