// =============================================================================
// TELECEL SYSTEM — notifications/mail.service.ts
// Envio de e-mails transacionais via Nodemailer com templates HTML
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private readonly from: string;
  private readonly appUrl: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.from = config.get<string>('mail.from', 'TELECEL <nao-responda@telecel.com.br>');
    this.appUrl = config.get<string>('app.frontendUrl', 'https://app.telecel.com.br');
    this.enabled = config.get<boolean>('mail.enabled', true);

    this.transporter = nodemailer.createTransport({
      host: config.get<string>('mail.host', 'smtp.gmail.com'),
      port: config.get<number>('mail.port', 587),
      secure: config.get<boolean>('mail.secure', false), // true para porta 465
      auth: {
        user: config.get<string>('mail.user'),
        pass: config.get<string>('mail.pass'),
      },
    });
  }

  // ─── ENVIO GENÉRICO ────────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`[MAIL DESABILITADO] Para: ${to} · Assunto: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`E-mail enviado para ${to}: ${subject}`);
    } catch (err) {
      // Nunca propaga erro de e-mail para não quebrar o fluxo principal
      this.logger.error(`Falha ao enviar e-mail para ${to}: ${err.message}`);
    }
  }

  // ─── TEMPLATE BASE ─────────────────────────────────────────────────────

  private wrap(content: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:#003087;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">TELECEL</h1>
        </td></tr>
        <tr><td style="padding:32px;color:#333333;font-size:15px;line-height:1.6;">
          ${content}
        </td></tr>
        <tr><td style="background:#f0f2f5;padding:18px 32px;color:#888888;font-size:12px;text-align:center;">
          TELECEL · Parceiro credenciado TIM<br>
          Este é um e-mail automático, não responda.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  private button(label: string, url: string): string {
    return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:6px;background:#003087;">
      <a href="${url}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${label}</a>
    </td></tr></table>`;
  }

  // ─── VERIFICAÇÃO DE E-MAIL ─────────────────────────────────────────────

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    const url = `${this.appUrl}/verify-email?token=${token}`;
    const html = this.wrap(`
      <h2 style="margin-top:0;color:#003087;">Bem-vindo(a), ${name}!</h2>
      <p>Sua conta no <strong>TELECEL System</strong> foi criada. Confirme seu e-mail para ativá-la:</p>
      ${this.button('Confirmar e-mail', url)}
      <p style="color:#888;font-size:13px;">Se você não solicitou este cadastro, ignore este e-mail.</p>
    `);
    await this.send(to, 'Confirme seu e-mail — TELECEL System', html);
  }

  // ─── RECUPERAÇÃO DE SENHA ──────────────────────────────────────────────

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const url = `${this.appUrl}/reset-password?token=${token}`;
    const html = this.wrap(`
      <h2 style="margin-top:0;color:#003087;">Redefinição de senha</h2>
      <p>Olá ${name}, recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no botão abaixo. O link expira em <strong>1 hora</strong>.</p>
      ${this.button('Redefinir senha', url)}
      <p style="color:#888;font-size:13px;">Se não foi você, ignore este e-mail — sua senha permanece inalterada.</p>
    `);
    await this.send(to, 'Redefinição de senha — TELECEL System', html);
  }

  // ─── NOVA VENDA (para supervisores) ────────────────────────────────────

  async sendNewSaleAlert(to: string, saleNumber: string): Promise<void> {
    const url = `${this.appUrl}/sales`;
    const html = this.wrap(`
      <h2 style="margin-top:0;color:#003087;">Nova venda aguardando aprovação</h2>
      <p>A venda <strong>${saleNumber}</strong> foi registrada e está pendente de revisão.</p>
      ${this.button('Revisar venda', url)}
    `);
    await this.send(to, `Venda ${saleNumber} pendente de aprovação`, html);
  }

  // ─── VENDA REVISADA (para vendedor) ────────────────────────────────────

  async sendSaleReviewedAlert(
    to: string,
    saleNumber: string,
    approved: boolean,
    reason?: string,
  ): Promise<void> {
    const status = approved ? 'aprovada' : 'rejeitada';
    const color = approved ? '#1a7f37' : '#cf222e';
    const html = this.wrap(`
      <h2 style="margin-top:0;color:${color};">Venda ${status}</h2>
      <p>Sua venda <strong>${saleNumber}</strong> foi <strong style="color:${color};">${status}</strong>.</p>
      ${reason ? `<p style="background:#f6f8fa;padding:12px;border-radius:6px;"><strong>Motivo:</strong> ${reason}</p>` : ''}
      ${this.button('Ver detalhes', `${this.appUrl}/sales`)}
    `);
    await this.send(to, `Venda ${saleNumber} ${status}`, html);
  }
}
