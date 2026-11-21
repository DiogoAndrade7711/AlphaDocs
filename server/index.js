import './config.js';
import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiLimiter } from './middleware/rateLimit.js';
import authRouter from './routes/auth.js';
import documentsRouter from './routes/documents.js';
import creditsRouter from './routes/credits.js';
import adminRouter from './routes/admin.js';
import webhooksRouter from './routes/webhooks.js';

const app = express();

// Raw body para verificação de webhooks
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => { data += chunk; });
  req.on('end', () => { req.rawBody = data; next(); });
});

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(apiLimiter);

// Rotas
app.use('/auth', authRouter);
app.use('/documents', documentsRouter);
app.use('/credits', creditsRouter);
app.use('/admin', adminRouter);
app.use('/webhooks', webhooksRouter);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Erro global
app.use((err, req, res, _next) => {
  console.error('[erro global]', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

app.listen(config.port, () => {
  console.log(`[AlphaDocs] servidor rodando na porta ${config.port} (${config.nodeEnv})`);
});
