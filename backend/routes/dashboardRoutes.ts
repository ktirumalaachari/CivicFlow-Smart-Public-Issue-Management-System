import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.ts';
import { authenticateJWT } from '../middleware/auth.ts';

const router = Router();

// Retrieve secure metrics, trends, and officer performances
router.get('/stats', authenticateJWT as any, DashboardController.getStats);

export default router;
