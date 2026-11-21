import 'dotenv/config';

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
  },

  docsApi: {
    key: process.env.DOCS_API_KEY,
    baseUrl: process.env.DOCS_API_BASE_URL || 'https://meudocdigital.com/api/public/v1',
    webhookSecret: process.env.DOCS_API_WEBHOOK_SECRET,
  },

  mercadopago: {
    accessToken: process.env.MP_ACCESS_TOKEN,
    webhookSecret: process.env.MP_WEBHOOK_SECRET,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'AlphaDocs <noreply@alphadocs.com.br>',
  },

  storage: {
    pdfBucket: process.env.PDF_BUCKET || 'alphadocs-pdfs',
  },
};

// Validação crítica
const required = [
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET', 'DOCS_API_KEY',
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[ERRO] Variável de ambiente obrigatória não definida: ${key}`);
    process.exit(1);
  }
}
