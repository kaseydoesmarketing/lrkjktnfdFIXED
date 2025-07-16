import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import testRoutes from './routes/tests.js';
import { pstScheduler } from './scheduler/pstScheduler.js';
import { extensionWebSocket } from './websocket/extensionSocket.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.use('/', authRoutes);
app.use('/', testRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    scheduler: pstScheduler.getSchedulerStatus(),
    websocket: extensionWebSocket.getConnectionStatus()
  });
});

app.get('/api/scheduler/status', (req, res) => {
  res.json(pstScheduler.getSchedulerStatus());
});

pstScheduler.startMidnightRotations();

app.listen(PORT, () => {
  console.log(`🚀 TitleTesterPro server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 WebSocket server running on port ${process.env.WEBSOCKET_PORT || 8080}`);
});
