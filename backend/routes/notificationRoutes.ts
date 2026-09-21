import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth.ts';
import { NotificationService } from '../services/NotificationService.ts';

const router = Router();

router.get('/stream', authenticateJWT as any, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE

  const userId = (req.user as { id: string }).id;
  NotificationService.addClient(userId, res);

  // If client closes connection, stop sending events
  req.on('close', () => {
    NotificationService.removeClient(userId, res);
  });
});

export default router;
