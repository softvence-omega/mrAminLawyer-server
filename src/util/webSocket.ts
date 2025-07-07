import WebSocket, { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { MessageModel } from '../modules/message/message.model';
import idConverter from '../util/idConverter';
import { IncomingMessage } from 'http';
import { Types } from 'mongoose';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
}

export const setupWebSocket = (server: any, jwtSecret: string) => {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: AuthenticatedWebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) return ws.close();

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      ws.userId = decoded.id;
    } catch (err) {
      ws.close();
    }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        const saved = await MessageModel.create({
          sender: idConverter(ws.userId!) as Types.ObjectId,
          receiver: idConverter(msg.receiverId) as Types.ObjectId,
          text: msg.text,
        });

        wss.clients.forEach((client) => {
          const authClient = client as AuthenticatedWebSocket;
          if (authClient.userId === msg.receiverId && client.readyState === 1) {
            client.send(JSON.stringify(saved));
          }
        });
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });
  });

  return wss;
};