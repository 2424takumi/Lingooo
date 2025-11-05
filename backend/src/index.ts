import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import geminiRouter from './routes/gemini';
import chatRouter from './routes/chat';
import { apiLimiter, chatLimiter, geminiLimiter } from './middleware/rate-limit';

// 環境変数を読み込む
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: (origin, callback) => {
    // originがundefinedの場合（同一オリジン）または許可リストに含まれる場合
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// JSONボディのパース (10MB limit for security)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/chat', chatLimiter);
app.use('/api/gemini', geminiLimiter);

// ルーター
app.use('/api/gemini', geminiRouter);
app.use('/api/chat', chatRouter);

// ヘルスチェック
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
