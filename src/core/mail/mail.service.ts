import { Injectable, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { getEnv, getEnvBoolean, getEnvNumber, isTest } from '@config/env';
import { logger } from '@core/logger';

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Thin nodemailer wrapper. Real HTML templates (invitation/reminder/passed/rejected/
 * offer/followup, team-invite, password-reset) are a follow-up — this gives every
 * other module a working `sendMail()` seam to build against now.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private transporter?: nodemailer.Transporter;

  onModuleInit(): void {
    if (isTest()) return;
    this.transporter = nodemailer.createTransport({
      host: getEnv('SMTP_HOST', 'localhost'),
      port: getEnvNumber('SMTP_PORT', 1025),
      secure: getEnvBoolean('SMTP_SECURE', false),
      auth: getEnv('SMTP_USER', '')
        ? { user: getEnv('SMTP_USER'), pass: getEnv('SMTP_PASSWORD', '') }
        : undefined,
    });
  }

  async sendMail({ to, subject, html }: SendMailInput): Promise<void> {
    if (!this.transporter) {
      logger.log(`[mail:skip-in-test] to=${to} subject="${subject}"`);
      return;
    }
    await this.transporter.sendMail({
      from: getEnv('SMTP_FROM', 'Better Screening <no-reply@betterscreening.app>'),
      to,
      subject,
      html,
    });
  }
}
