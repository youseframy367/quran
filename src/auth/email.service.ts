import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// This service isolates email delivery from the authentication business logic.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  // The transporter is created lazily so the app can still start in local development.
  private createTransporter(): nodemailer.Transporter | null {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    // Without SMTP variables, development can continue and the OTP is printed locally.
    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user, pass },
    });
  }

  // Sends the six-digit OTP without ever storing the plain OTP in the database.
  async sendOtp(email: string, otp: string, purpose: 'signup' | 'reset'): Promise<void> {
    const transporter = this.createTransporter();
    const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@example.com';
    const purposeText = purpose === 'signup' ? 'verify your account' : 'reset your password';

    // This fallback is useful locally; configure SMTP before using the API in production.
    if (!transporter) {
      this.logger.warn(`[DEV ONLY] OTP for ${email} (${purpose}): ${otp}`);
      return;
    }

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Your Quran account verification code',
      text: `Your code to ${purposeText} is ${otp}. It expires in 10 minutes.`,
      html: `<p>Your code to <strong>${purposeText}</strong> is:</p><h2>${otp}</h2><p>It expires in 10 minutes.</p>`,
    });
  }
}
