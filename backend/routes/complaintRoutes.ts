import { Router } from 'express';
import { ComplaintController } from '../controllers/complaintController.ts';
import { authenticateJWT, requireCitizen, requireOfficer, requireAdmin } from '../middleware/auth.ts';
import { upload } from '../middleware/upload.ts';

const router = Router();

// 1. Submit complaint (Citizen only - accepts optional image file)
router.post('/', authenticateJWT as any, requireCitizen as any, upload.single('image'), ComplaintController.registerComplaint);

// 1b. AI Analyze complaint (Citizen only)
router.post('/analyze', authenticateJWT as any, requireCitizen as any, ComplaintController.analyzeComplaint);

// 1c. Check Duplicate (Citizen only)
router.post('/check-duplicate', authenticateJWT as any, requireCitizen as any, ComplaintController.checkDuplicate);

// 1d. Support Complaint (Citizen only)
router.post('/:id/support', authenticateJWT as any, requireCitizen as any, ComplaintController.supportComplaint);

// 2. Fetch all complaints (Admin/Generic)
router.get('/', authenticateJWT as any, ComplaintController.getAllComplaints);

// 2a. Fetch complaint by ID
router.get('/:id', authenticateJWT as any, ComplaintController.getComplaintById);

// 3. Admin: Assign complaint to an officer
router.put('/:id/assign', authenticateJWT as any, requireAdmin as any, ComplaintController.assignOfficer);

import { OfficerController } from '../controllers/officerController.ts';
// 3b. Admin: Reassign complaint
router.put('/:id/reassign', authenticateJWT as any, requireAdmin as any, OfficerController.reassignComplaint);

// 4. Officer/Admin: Update complaint status only
// Since status can be updated by either, we can allow authenticated but we verify in the controller or use authorizeRoles
import { authorizeRoles } from '../middleware/auth.ts';
router.put('/:id/status', authenticateJWT as any, authorizeRoles(['Officer', 'Administrator']) as any, ComplaintController.updateStatus);

// 4b. Officer: Accept complaint assignment
router.put('/:id/accept', authenticateJWT as any, requireOfficer as any, ComplaintController.acceptComplaint);

// 5. Officer: Resolve complaint (Accepts resolution notes & resolution image file)
router.put('/:id/resolve', authenticateJWT as any, requireOfficer as any, upload.single('image'), ComplaintController.resolveComplaint);

// 6. Public Tracking Portal (No login/auth required)
router.get('/track/:trackingId', ComplaintController.publicTrack);

// 7. Notification Endpoints (Protected)
router.get('/notifications/list', authenticateJWT as any, ComplaintController.getNotifications);
router.put('/notifications/read', authenticateJWT as any, ComplaintController.markNotificationsRead);

export default router;
