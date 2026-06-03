require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const { testConnection } = require('./utils/db');
const routes             = require('./routes');
const setupSocket        = require('./socket');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app    = express();
const server = http.createServer(app);
const io     = setupSocket(server);

app.set('io', io);
app.set('trust proxy', 1);

// ─── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    process.env.CUSTOMER_URL || 'http://localhost:3000',
    process.env.ADMIN_URL    || 'http://localhost:3001',
  ],
  credentials: true,
}));

// ─── Rate Limiting ───────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  message:  { success: false, message: 'คำขอมากเกินไป กรุณารอสักครู่' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const orderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'สั่งอาหารถี่เกินไป กรุณารอสักครู่' },
});

app.use('/api/', limiter);
app.use('/api/order', orderLimiter);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api', routes);

app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ─── Error Handling ──────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 4000;

(async () => {
  await testConnection();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
})();
