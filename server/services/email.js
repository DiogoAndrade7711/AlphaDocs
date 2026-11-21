import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: { user: config.smtp.user, pass: config.smtp.pass },
});

export const email = {
  async sendPasswordReset(to, name, link) {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: 'AlphaDocs — Redefinição de Senha',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
          <h2 style="color:#2563EB">AlphaDocs</h2>
          <p>Olá, <strong>${name}</strong>!</p>
          <p>Você solicitou a redefinição de senha. Clique no botão abaixo:</p>
          <a href="${link}" style="display:inline-block;background:#2563EB;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
            Redefinir Senha
          </a>
          <p style="color:#6b7280;font-size:13px">O link expira em 1 hora. Se não foi você, ignore este e-mail.</p>
        </div>
      `,
    });
  },

  async sendWelcome(to, name) {
    await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject: 'Bem-vindo ao AlphaDocs!',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
          <h2 style="color:#2563EB">AlphaDocs</h2>
          <p>Olá, <strong>${name}</strong>! Sua conta foi criada com sucesso.</p>
          <p>Acesse agora e gere seus documentos com facilidade.</p>
        </div>
      `,
    });
  },
};
