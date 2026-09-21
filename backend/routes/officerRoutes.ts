import { Router } from 'express';
import { OfficerController } from '../controllers/officerController.ts';
import { authenticateJWT, requireAdmin } from '../middleware/auth.ts';

const router = Router();

// ==========================================
// OFFICER ASSIGNMENT APIs (Admin Only)
// ==========================================
router.get('/workload', authenticateJWT as any, requireAdmin as any, OfficerController.getWorkload);
router.get('/available', authenticateJWT as any, requireAdmin as any, OfficerController.getAvailable);

export default router;
