import { Router } from 'express';
import { AdminController } from '../controllers/adminController.ts';
import { authenticateJWT, requireAdmin } from '../middleware/auth.ts';

const router = Router();

// ==========================================
// ANNOUNCEMENTS (Accessible by all authenticated roles)
// ==========================================
router.get('/announcements', authenticateJWT as any, AdminController.getAnnouncements);
router.post('/announcements', authenticateJWT as any, requireAdmin as any, AdminController.createAnnouncement);

// ==========================================
// ROLES & USERS MANAGEMENT (Admin Only)
// ==========================================
router.get('/users', authenticateJWT as any, requireAdmin as any, AdminController.getUsers);

// ==========================================
// OFFICER ACCOUNTS CRUD (Admin Only)
// ==========================================
router.get('/officers', authenticateJWT as any, requireAdmin as any, AdminController.getOfficers);
router.post('/officers', authenticateJWT as any, requireAdmin as any, AdminController.createOfficer);
router.put('/officers/:id', authenticateJWT as any, requireAdmin as any, AdminController.updateOfficer);
router.put('/users/:id/toggle-status', authenticateJWT as any, requireAdmin as any, AdminController.toggleUserStatus);

// ==========================================
// DEPARTMENTS CRUD (Admin Only)
// ==========================================
router.get('/departments', authenticateJWT as any, requireAdmin as any, AdminController.getDepartments);
router.post('/departments', authenticateJWT as any, requireAdmin as any, AdminController.createDepartment);
router.put('/departments/:id', authenticateJWT as any, requireAdmin as any, AdminController.updateDepartment);
router.delete('/departments/:id', authenticateJWT as any, requireAdmin as any, AdminController.deleteDepartment);

// ==========================================
// CATEGORIES CRUD (Admin Only)
// ==========================================
router.get('/categories', authenticateJWT as any, requireAdmin as any, AdminController.getCategories);
router.post('/categories', authenticateJWT as any, requireAdmin as any, AdminController.createCategory);
router.put('/categories/:id', authenticateJWT as any, requireAdmin as any, AdminController.updateCategory);
router.delete('/categories/:id', authenticateJWT as any, requireAdmin as any, AdminController.deleteCategory);

// ==========================================
// WORKFLOW COMPLAINT ADVANCED INTERACTIONS (Admin Only)
// ==========================================
router.put('/complaints/:id/verify-close', authenticateJWT as any, requireAdmin as any, AdminController.verifyAndCloseComplaint);
router.put('/complaints/:id/reassign', authenticateJWT as any, requireAdmin as any, AdminController.reassignComplaint);

export default router;
