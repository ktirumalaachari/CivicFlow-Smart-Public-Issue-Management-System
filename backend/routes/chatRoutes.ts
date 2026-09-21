import { Router } from 'express';
import { ChatController } from '../controllers/chatController.ts';

const router = Router();

// Endpoint for interacting with CivicBot
// Both guests and logged-in users can use the chat
router.post('/', ChatController.handleChat);

export default router;
