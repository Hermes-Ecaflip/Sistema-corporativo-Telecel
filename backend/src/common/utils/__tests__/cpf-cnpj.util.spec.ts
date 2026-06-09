// =============================================================================
// TELECEL SYSTEM — common/utils/__tests__/cpf-cnpj.util.spec.ts
// Testes unitários da validação de CPF/CNPJ (dígitos verificadores)
// =============================================================================

import { CpfCnpjUtil } from '../cpf-cnpj.util';

describe('CpfCnpjUtil', () => {
  describe('isValidCpf', () => {
    it('valida CPFs corretos', () => {
      expect(CpfCnpjUtil.isValidCpf('529.982.247-25')).toBe(true);
      expect(CpfCnpjUtil.isValidCpf('52998224725')).toBe(true);
      expect(CpfCnpjUtil.isValidCpf('111.444.777-35')).toBe(true);
    });

    it('rejeita CPFs com dígito verificador inválido', () => {
      expect(CpfCnpjUtil.isValidCpf('529.982.247-20')).toBe(false);
      expect(CpfCnpjUtil.isValidCpf('12345678900')).toBe(false);
    });

    it('rejeita CPFs com todos os dígitos iguais', () => {
      expect(CpfCnpjUtil.isValidCpf('111.111.111-11')).toBe(false);
      expect(CpfCnpjUtil.isValidCpf('00000000000')).toBe(false);
    });

    it('rejeita CPFs com tamanho incorreto', () => {
      expect(CpfCnpjUtil.isValidCpf('123')).toBe(false);
      expect(CpfCnpjUtil.isValidCpf('')).toBe(false);
      expect(CpfCnpjUtil.isValidCpf('123456789012345')).toBe(false);
    });
  });

  describe('isValidCnpj', () => {
    it('valida CNPJs corretos', () => {
      expect(CpfCnpjUtil.isValidCnpj('11.222.333/0001-81')).toBe(true);
      expect(CpfCnpjUtil.isValidCnpj('11222333000181')).toBe(true);
    });

    it('rejeita CNPJs com dígito verificador inválido', () => {
      expect(CpfCnpjUtil.isValidCnpj('11.222.333/0001-00')).toBe(false);
      expect(CpfCnpjUtil.isValidCnpj('00000000000100')).toBe(false);
    });

    it('rejeita CNPJs com todos os dígitos iguais', () => {
      expect(CpfCnpjUtil.isValidCnpj('11.111.111/1111-11')).toBe(false);
    });

    it('rejeita CNPJs com tamanho incorreto', () => {
      expect(CpfCnpjUtil.isValidCnpj('123')).toBe(false);
      expect(CpfCnpjUtil.isValidCnpj('')).toBe(false);
    });
  });

  describe('cleanCpf / cleanCnpj', () => {
    it('remove formatação', () => {
      expect(CpfCnpjUtil.cleanCpf('529.982.247-25')).toBe('52998224725');
      expect(CpfCnpjUtil.cleanCnpj('11.222.333/0001-81')).toBe('11222333000181');
    });
  });

  describe('formatCpf / formatCnpj', () => {
    it('formata corretamente', () => {
      expect(CpfCnpjUtil.formatCpf('52998224725')).toBe('529.982.247-25');
      expect(CpfCnpjUtil.formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
    });
  });
});
