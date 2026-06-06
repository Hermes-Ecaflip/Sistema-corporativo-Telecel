// =============================================================================
// TELECEL SYSTEM — common/utils/cpf-cnpj.util.ts
// Validação algorítmica completa de CPF e CNPJ (dígitos verificadores)
// =============================================================================

export class CpfCnpjUtil {

  // ─── CPF ──────────────────────────────────────────────────────────────────

  /**
   * Valida CPF verificando os dígitos verificadores.
   * Aceita formatos: "123.456.789-09" ou "12345678909"
   */
  static isValidCpf(cpf: string): boolean {
    if (!cpf) return false;

    // Remover formatação
    const cleaned = cpf.replace(/\D/g, '');

    // Deve ter exatamente 11 dígitos
    if (cleaned.length !== 11) return false;

    // Rejeitar sequências óbvias (todos os dígitos iguais)
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    // Calcular e verificar 1º dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[9])) return false;

    // Calcular e verificar 2º dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[10])) return false;

    return true;
  }

  /**
   * Formata CPF: "12345678909" → "123.456.789-09"
   */
  static formatCpf(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Remove formatação do CPF: "123.456.789-09" → "12345678909"
   */
  static cleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  // ─── CNPJ ─────────────────────────────────────────────────────────────────

  /**
   * Valida CNPJ verificando os dígitos verificadores.
   * Aceita formatos: "12.345.678/0001-95" ou "12345678000195"
   */
  static isValidCnpj(cnpj: string): boolean {
    if (!cnpj) return false;

    const cleaned = cnpj.replace(/\D/g, '');

    if (cleaned.length !== 14) return false;

    // Rejeitar sequências iguais
    if (/^(\d)\1{13}$/.test(cleaned)) return false;

    // Pesos para cálculo dos dígitos verificadores
    const calcDigit = (cnpj: string, length: number): number => {
      const weights =
        length === 12
          ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
          : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

      let sum = 0;
      for (let i = 0; i < length; i++) {
        sum += parseInt(cnpj[i]) * weights[i];
      }

      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    const digit1 = calcDigit(cleaned, 12);
    if (digit1 !== parseInt(cleaned[12])) return false;

    const digit2 = calcDigit(cleaned, 13);
    if (digit2 !== parseInt(cleaned[13])) return false;

    return true;
  }

  /**
   * Formata CNPJ: "12345678000195" → "12.345.678/0001-95"
   */
  static formatCnpj(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    );
  }

  /**
   * Remove formatação do CNPJ
   */
  static cleanCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  // ─── DETECÇÃO AUTOMÁTICA ──────────────────────────────────────────────────

  /**
   * Detecta automaticamente se é CPF ou CNPJ e valida.
   */
  static isValid(value: string): boolean {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) return this.isValidCpf(value);
    if (cleaned.length === 14) return this.isValidCnpj(value);
    return false;
  }

  /**
   * Formata automaticamente CPF ou CNPJ.
   */
  static format(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) return this.formatCpf(cleaned);
    if (cleaned.length === 14) return this.formatCnpj(cleaned);
    return value;
  }

  /**
   * Retorna o tipo do documento.
   */
  static getType(value: string): 'CPF' | 'CNPJ' | null {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) return 'CPF';
    if (cleaned.length === 14) return 'CNPJ';
    return null;
  }

  /**
   * Mascara parcialmente para exibição segura: "123.456.***-**"
   */
  static mask(value: string): string {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.***-**');
    }
    if (cleaned.length === 14) {
      return cleaned.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        '$1.$2.$3/****-**',
      );
    }
    return value;
  }
}

// ─── VALIDATOR para class-validator ──────────────────────────────────────────

import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsCpf', async: false })
export class IsCpfConstraint implements ValidatorConstraintInterface {
  validate(cpf: string): boolean {
    return CpfCnpjUtil.isValidCpf(cpf);
  }
  defaultMessage(): string {
    return 'CPF inválido';
  }
}

@ValidatorConstraint({ name: 'IsCnpj', async: false })
export class IsCnpjConstraint implements ValidatorConstraintInterface {
  validate(cnpj: string): boolean {
    return CpfCnpjUtil.isValidCnpj(cnpj);
  }
  defaultMessage(): string {
    return 'CNPJ inválido';
  }
}

@ValidatorConstraint({ name: 'IsCpfOrCnpj', async: false })
export class IsCpfOrCnpjConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return CpfCnpjUtil.isValid(value);
  }
  defaultMessage(): string {
    return 'CPF ou CNPJ inválido';
  }
}

/** Decorator: valida CPF com algoritmo de dígitos verificadores */
export function IsCpf(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsCpfConstraint,
    });
}

/** Decorator: valida CNPJ com algoritmo de dígitos verificadores */
export function IsCnpj(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsCnpjConstraint,
    });
}

/** Decorator: valida CPF ou CNPJ automaticamente */
export function IsCpfOrCnpj(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsCpfOrCnpjConstraint,
    });
}
