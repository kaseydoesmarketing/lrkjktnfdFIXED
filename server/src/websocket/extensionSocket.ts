import WebSocket from 'ws';
import { db } from '../db/index.js';
import { analyticsPolls, extensionConnections } from '../db/schema.js';
import { eq } from 'drizzle-orm';

interface ExtensionMessage {
  type: 'ANALYTICS_DATA' | 'TITLE_UPDATE_COMPLETE' | 'HEARTBEAT' | 'AUTH';
  data: any;
  userId?: string;
  timestamp: number;
}

export class ExtensionWebSocket {
  private wss: WebSocket.Server;
  private connections = new Map<string, WebSocket>();

  constructor(port: number = 8080) {
    this.wss = new WebSocket.Server({ port });
    this.setupConnectionHandlers();
    console.log(`🔌 Extension WebSocket server started on port ${port}`);
  }

  private setupConnectionHandlers() {
    this.wss.on('connection', (ws) => {
      console.log('🔗 New extension connection');

      ws.on('message', async (data) => {
        try {
          const message: ExtensionMessage = JSON.parse(data.toString());
          await this.handleExtensionMessage(ws, message);
        } catch (error) {
          console.error('❌ Error parsing extension message:', error);
          ws.send(JSON.stringify({ 
            type: 'ERROR', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        console.log('🔌 Extension disconnected');
        this.removeConnection(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });
    });
  }

  private async handleExtensionMessage(ws: WebSocket, message: ExtensionMessage) {
    switch (message.type) {
      case 'AUTH':
        await this.handleAuth(ws, message);
        break;
      
      case 'ANALYTICS_DATA':
        await this.processAnalyticsData(message);
        break;
      
      case 'TITLE_UPDATE_COMPLETE':
        await this.confirmTitleUpdate(message);
        break;
      
      case 'HEARTBEAT':
        ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
        break;
      
      default:
        console.log(`⚠️ Unknown message type: ${message.type}`);
    }
  }

  private async handleAuth(ws: WebSocket, message: ExtensionMessage) {
    const { userId, extensionId } = message.data;
    
    if (!userId || !extensionId) {
      ws.send(JSON.stringify({ 
        type: 'AUTH_ERROR', 
        message: 'Missing userId or extensionId' 
      }));
      return;
    }

    this.connections.set(userId, ws);

    await db.insert(extensionConnections).values({
      id: crypto.randomUUID(),
      userId,
      extensionId,
      lastConnected: new Date(),
      status: 'connected'
    }).onConflictDoUpdate({
      target: [extensionConnections.userId],
      set: {
        lastConnected: new Date(),
        status: 'connected'
      }
    });

    ws.send(JSON.stringify({ 
      type: 'AUTH_SUCCESS', 
      message: 'Extension authenticated successfully' 
    }));

    console.log(`✅ Extension authenticated for user ${userId}`);
  }

  private async processAnalyticsData(message: ExtensionMessage) {
    const { titleId, views, impressions, clicks, ctr, averageViewDuration } = message.data;
    
    if (!titleId || views === undefined || impressions === undefined) {
      console.error('❌ Invalid analytics data received');
      return;
    }

    try {
      await db.insert(analyticsPolls).values({
        id: crypto.randomUUID(),
        titleId,
        views: parseInt(views),
        impressions: parseInt(impressions),
        clicks: parseInt(clicks || 0),
        ctr: parseFloat(ctr || 0),
        averageViewDuration: parseInt(averageViewDuration || 0),
        polledAt: new Date()
      });

      console.log(`📊 Analytics data saved for title ${titleId}`);
    } catch (error) {
      console.error('❌ Error saving analytics data:', error);
    }
  }

  private async confirmTitleUpdate(message: ExtensionMessage) {
    const { testId, titleId, success, error } = message.data;
    
    console.log(`${success ? '✅' : '❌'} Title update ${success ? 'completed' : 'failed'} for test ${testId}`);
    
    if (error) {
      console.error('Title update error:', error);
    }
  }

  private removeConnection(ws: WebSocket) {
    for (const [userId, connection] of this.connections.entries()) {
      if (connection === ws) {
        this.connections.delete(userId);
        break;
      }
    }
  }

  sendCommandToExtension(userId: string, command: any) {
    const connection = this.connections.get(userId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(command));
      return true;
    }
    return false;
  }

  getConnectionStatus() {
    return {
      totalConnections: this.connections.size,
      connectedUsers: Array.from(this.connections.keys())
    };
  }
}

export const extensionWebSocket = new ExtensionWebSocket(
  parseInt(process.env.WEBSOCKET_PORT || '8080')
);
