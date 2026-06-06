// =============================================================================
// TELECEL SYSTEM — auth/two-factor.service.ts
// Serviço 2FA TOTP: geração, QR Code, validação, criptografia AES-256-GCM
// Compatível com Google Authenticator, Authy e 1Password
// =============================================================================

import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly appName: string;
  private readonly encryptionKey: Buffer;

  // Configurações do TOTP
  private readonly TOTP_CONFIG = {
    digits: 6,          // Código de 6 dígitos
    step: 30,           // Janela de 30 segundos
    window: 1,          // Tolerância de ±1 janela (acomoda clock drift)
  };

  constructor(private readonly configService: ConfigService) {
    this.appName = configService.get<string>('app.name', 'TELECEL System');

    // Derivar chave de criptografia a partir do JWT_SECRET
    // scrypt é resistente a ataques de força bruta
    const masterKey = configService.get<string>('jwt.secret', '');
    this.encryptionKey = scryptSync(masterKey, 'telecel-2fa-salt', 32);

    // Configurar otplib
    authenticator.options = {
      digits: this.TOTP_CONFIG.digits,
      step: this.TOTP_CONFIG.step,
      window: this.TOTP_CONFIG.window,
    };
  }

  // ─── Geração de Secret ─────────────────────────────────────────────────

  /**
   * Gera um novo secret TOTP para o usuário.
   * Retorna o secret em Base32 (formato padrão para QR code)
   */
  generateSecret(): string {
    return authenticator.generateSecret(20); // 160 bits de entropia
  }

  /**
   * Gera a URL otpauth:// para o QR code
   */
  generateOtpAuthUrl(email: string, secret: string): string {
    return authenticator.keyuri(email, this.appName, secret);
  }

  /**
   * Gera o QR code em base64 para exibição no frontend.
   * Fluxo: usuário escaneia com o app → começa a receber códigos TOTP
   */
  async generateQRCode(email: string, secret: string): Promise<string> {
    try {
      const otpAuthUrl = this.generateOtpAuthUrl(email, secret);
      const qrCode = await QRCode.toDataURL(otpAuthUrl, {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
        width: 256,
      });
      return qrCode; // data:image/png;base64,...
    } catch (error) {
      this.logger.error('Erro ao gerar QR Code 2FA', error);
      throw new InternalServerErrorException('Erro ao gerar QR Code');
    }
  }

  // ─── Validação de Código ───────────────────────────────────────────────

  /**
   * Valida o código TOTP informado pelo usuário.
   * Desencripta o secret armazenado e verifica o código.
   */
  validateCode(encryptedSecret: string, token: string): boolean {
    try {
      const secret = this.decryptSecret(encryptedSecret);
      return authenticator.check(token, secret);
    } catch (error) {
      this.logger.warn(`Falha na validação 2FA: ${error.message}`);
      return false;
    }
  }

  /**
   * Valida o código e lança exceção se inválido (uso em endpoints)
   */
  validateCodeOrThrow(encryptedSecret: string, token: string): void {
    const isValid = this.validateCode(encryptedSecret, token);
    if (!isValid) {
      throw new BadRequestException(
        'Código 2FA inválido ou expirado. Verifique seu aplicativo autenticador.',
      );
    }
  }

  // ─── Criptografia do Secret ────────────────────────────────────────────

  /**
   * Encripta o secret TOTP com AES-256-GCM antes de salvar no banco.
   * Formato: iv(12 bytes) + authTag(16 bytes) + ciphertext — tudo em hex
   */
  encryptSecret(plainSecret: string): string {
    try {
      const iv = randomBytes(12); // GCM recomenda IV de 96 bits
      const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

      const encrypted = Buffer.concat([
        cipher.update(plainSecret, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag(); // Tag de autenticação GCM

      // Concatenar iv + authTag + dados encriptados
      return Buffer.concat([iv, authTag, encrypted]).toString('hex');
    } catch (error) {
      this.logger.error('Erro ao encriptar secret 2FA');
      throw new InternalServerErrorException('Erro interno de segurança');
    }
  }

  /**
   * Desencripta o secret TOTP armazenado no banco.
   */
  decryptSecret(encryptedHex: string): string {
    try {
      const buffer = Buffer.from(encryptedHex, 'hex');

      const iv = buffer.subarray(0, 12);
      const authTag = buffer.subarray(12, 28);
      const ciphertext = buffer.subarray(28);

      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      this.logger.error('Erro ao desencriptar secret 2FA — dados corrompidos?');
      throw new InternalServerErrorException('Erro interno de segurança');
    }
  }

  // ─── Códigos de recuperação ────────────────────────────────────────────

  /**
   * Gera 10 códigos de recuperação de uso único (backup codes).
   * Exibidos uma única vez ao usuário no momento de ativação do 2FA.
   */
  generateBackupCodes(count = 10): string[] {
    return Array.from({ length: count }, () =>
      randomBytes(4).toString('hex').toUpperCase(), // ex: "A3F2-BC91"
    ).map((code) => `${code.slice(0, 4)}-${code.slice(4)}`);
  }
}
