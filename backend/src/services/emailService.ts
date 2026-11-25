import nodemailer, { type Transporter } from "nodemailer";
import { config } from "../config/env.js";

export interface EmailSendResult {
  delivered: boolean;
  channel: "smtp" | "console-fallback";
}

let cachedSmtpTransporter: Transporter | null = null;

function getSmtpTransporter(): Transporter | null {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    return null;
  }
  if (!cachedSmtpTransporter) {
    const port = config.SMTP_PORT || 587;
    const isGmail = config.SMTP_HOST.toLowerCase().includes("gmail");
    const smtpPass = isGmail ? config.SMTP_PASS.replace(/\s+/g, "") : config.SMTP_PASS;
    cachedSmtpTransporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: config.SMTP_USER,
        pass: smtpPass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return cachedSmtpTransporter;
}

// Test-only observer caches populated strictly when NODE_ENV === "test"; never exposed over HTTP.
const testOtpCache = new Map<string, string>();
const testResetTokenCache = new Map<string, string>();

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  devLabel: string;
  devDetails: Record<string, string>;
}): Promise<EmailSendResult> {
  if (process.env.NODE_ENV !== "test") {
    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        const sender = config.EMAIL_FROM || `AlgoLens <${config.SMTP_USER}>`;
        await transporter.sendMail({
          from: sender,
          to: params.to,
          subject: params.subject,
          html: params.html,
        });
        return { delivered: true, channel: "smtp" };
      } catch (err: any) {
        if (!config.isProduction) {
          console.warn(
            `\n[AlgoLens Mail Warning] SMTP delivery failed (${err?.message || "connection error"}). ` +
              `Verify SMTP_HOST / SMTP_USER / SMTP_PASS (for Gmail use a 16-char App Password). Falling back to console output.`
          );
        } else {
          throw new Error(`SMTP email delivery failed: ${err?.message || "Unknown error"}`);
        }
      }
    }
  }

  if (config.isProduction && !config.SMTP_HOST) {
    console.warn(
      `[AlgoLens Auth Warning] No SMTP_HOST configured in production for ${params.devLabel} to ${params.to}`
    );
    return { delivered: false, channel: "console-fallback" };
  }

  const formattedDetails = Object.entries(params.devDetails)
    .map(([label, value]) => `${label.padEnd(10)}: ${value}`)
    .join("\n");

  console.log(
    `\n========================================================\n` +
      `[AlgoLens Dev Mail] ${params.devLabel}\n` +
      `Recipient : ${params.to}\n` +
      `${formattedDetails}\n` +
      `========================================================\n`
  );

  return { delivered: true, channel: "console-fallback" };
}

export const emailService = {
  getLastTestOtp(email: string): string | undefined {
    if (process.env.NODE_ENV !== "test") return undefined;
    return testOtpCache.get(email.trim().toLowerCase());
  },

  clearTestOtps(): void {
    testOtpCache.clear();
  },

  getLastTestResetToken(email: string): string | undefined {
    if (process.env.NODE_ENV !== "test") return undefined;
    return testResetTokenCache.get(email.trim().toLowerCase());
  },

  clearTestResetTokens(): void {
    testResetTokenCache.clear();
  },

  /**
   * Sends a 6-digit verification OTP email.
   */
  async sendOtpEmail(params: {
    to: string;
    name: string;
    otpCode: string;
    expiresMinutes?: number;
  }): Promise<EmailSendResult> {
    const expiresMinutes = params.expiresMinutes ?? 10;

    if (process.env.NODE_ENV === "test") {
      testOtpCache.set(params.to.trim().toLowerCase(), params.otpCode);
    }

    return sendTransactionalEmail({
      to: params.to,
      subject: `${params.otpCode} is your AlgoLens verification code`,
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-top: 0;">Verify your AlgoLens email</h2>
          <p style="color: #475569; font-size: 14px;">Hi ${escapeHtml(params.name)},</p>
          <p style="color: #475569; font-size: 14px;">Enter this 6-digit verification code to complete your signup:</p>
          <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #4f46e5; background: #eef2ff; padding: 16px; border-radius: 10px; text-align: center; margin: 20px 0;">
            ${escapeHtml(params.otpCode)}
          </div>
          <p style="color: #64748b; font-size: 12px;">This code expires in ${expiresMinutes} minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      devLabel: "Email Verification Code",
      devDetails: {
        "OTP Code": params.otpCode,
        Expires: `${expiresMinutes} minutes`,
      },
    });
  },

  /**
   * Sends a password reset token via configured mail provider or dev console fallback.
   */
  async sendPasswordResetEmail(params: {
    to: string;
    name: string;
    resetToken: string;
    expiresMinutes?: number;
  }): Promise<EmailSendResult> {
    const expiresMinutes = params.expiresMinutes ?? 60;

    if (process.env.NODE_ENV === "test") {
      testResetTokenCache.set(params.to.trim().toLowerCase(), params.resetToken);
    }

    return sendTransactionalEmail({
      to: params.to,
      subject: "Reset your AlgoLens password",
      html: `
        <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-top: 0;">Reset your AlgoLens password</h2>
          <p style="color: #475569; font-size: 14px;">Hi ${escapeHtml(params.name)},</p>
          <p style="color: #475569; font-size: 14px;">Use the reset token below on the password reset page:</p>
          <div style="font-size: 13px; font-family: monospace; word-break: break-all; color: #1e293b; background: #f8fafc; padding: 14px; border: 1px solid #e2e8f0; border-radius: 10px; margin: 20px 0;">
            ${escapeHtml(params.resetToken)}
          </div>
          <p style="color: #64748b; font-size: 12px;">This token expires in ${expiresMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
      devLabel: "Password Reset Token",
      devDetails: {
        Token: params.resetToken,
        Expires: `${expiresMinutes} minutes`,
      },
    });
  },
};
