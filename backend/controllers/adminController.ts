import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { loadFallbackStore, saveFallbackStore } from '../middleware/db.ts';
import bcrypt from 'bcryptjs';

export class AdminController {
  // ==========================================
  // 1. OFFICER CRUD OPERATIONS
  // ==========================================

  // List all officers
  static async getOfficers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = loadFallbackStore();
      const officers = store.users.filter(u => u.role === 'Officer');
      res.status(200).json({ officers });
    } catch (err) {
      console.error('Error fetching officers:', err);
      res.status(500).json({ message: 'Error retrieving officers list.' });
    }
  }

  // Create an Officer account
  static async createOfficer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { name, email, phone, department, password } = req.body;

    if (!name || !email || !department) {
      res.status(400).json({ message: 'Name, email, and department are required.' });
      return;
    }

    try {
      const store = loadFallbackStore();
      const existing = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        res.status(409).json({ message: 'An account with this email address already exists.' });
        return;
      }

      // Default password or custom password
      const pwd = password || 'officer123';
      const hash = await bcrypt.hash(pwd, 10);

      const newOfficer = {
        id: store.users.length > 0 ? Math.max(...store.users.map(u => u.id)) + 1 : 1,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        password: hash,
        role: 'Officer',
        department,
        avatar: null,
        is_active: 1, // 1 = Active, 0 = Inactive
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      store.users.push(newOfficer);
      saveFallbackStore(store);

      res.status(201).json({
        message: 'Officer account created successfully.',
        officer: {
          id: newOfficer.id,
          name: newOfficer.name,
          email: newOfficer.email,
          phone: newOfficer.phone,
          department: newOfficer.department,
          is_active: newOfficer.is_active
        }
      });
    } catch (err) {
      console.error('Error creating officer account:', err);
      res.status(500).json({ message: 'Error creating officer.' });
    }
  }

  // Edit Officer account
  static async updateOfficer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, email, phone, department, is_active } = req.body;

    try {
      const store = loadFallbackStore();
      const idx = store.users.findIndex(u => u.id === Number(id));

      if (idx === -1) {
        res.status(404).json({ message: 'Officer account not found.' });
        return;
      }

      if (store.users[idx].role !== 'Officer') {
        res.status(400).json({ message: 'Target user is not an Officer.' });
        return;
      }

      // Check email duplicate if changed
      if (email && email.toLowerCase() !== store.users[idx].email.toLowerCase()) {
        const dup = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (dup) {
          res.status(409).json({ message: 'Email already in use by another account.' });
          return;
        }
        store.users[idx].email = email.toLowerCase();
      }

      if (name) store.users[idx].name = name;
      if (phone !== undefined) store.users[idx].phone = phone;
      if (department) store.users[idx].department = department;
      if (is_active !== undefined) store.users[idx].is_active = Number(is_active);
      store.users[idx].updated_at = new Date().toISOString();

      saveFallbackStore(store);

      res.status(200).json({
        message: 'Officer account updated successfully.',
        officer: store.users[idx]
      });
    } catch (err) {
      console.error('Error editing officer account:', err);
      res.status(500).json({ message: 'Error updating officer account.' });
    }
  }

  // Toggle Officer / User status or set specific status
  static async toggleUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const store = loadFallbackStore();
      const idx = store.users.findIndex(u => u.id === Number(id));

      if (idx === -1) {
        res.status(404).json({ message: 'User account not found.' });
        return;
      }

      if (status) {
        store.users[idx].status = status;
        store.users[idx].is_active = status === 'ACTIVE' ? 1 : 0;
      } else {
        const currentStatus = store.users[idx].status || (store.users[idx].is_active === 0 ? 'SUSPENDED' : 'ACTIVE');
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        store.users[idx].status = newStatus;
        store.users[idx].is_active = newStatus === 'ACTIVE' ? 1 : 0;
      }
      store.users[idx].updated_at = new Date().toISOString();

      saveFallbackStore(store);

      res.status(200).json({
        message: `Account status updated to ${store.users[idx].status}.`,
        status: store.users[idx].status,
        is_active: store.users[idx].is_active
      });
    } catch (err) {
      console.error('Error updating user status:', err);
      res.status(500).json({ message: 'Error updating user status.' });
    }
  }


  // ==========================================
  // 2. DEPARTMENT CRUD OPERATIONS
  // ==========================================

  static async getDepartments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = loadFallbackStore();
      res.status(200).json({ departments: store.departments || [] });
    } catch (err) {
      res.status(500).json({ message: 'Error retrieving departments.' });
    }
  }

  static async createDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { name, head } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Department name is required.' });
      return;
    }

    try {
      const store = loadFallbackStore();
      if (!store.departments) store.departments = [];

      const exists = store.departments.some(d => d.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        res.status(409).json({ message: 'Department already exists.' });
        return;
      }

      const newDept = {
        id: store.departments.length > 0 ? Math.max(...store.departments.map(d => d.id)) + 1 : 1,
        name,
        head: head || 'Unassigned',
        active: 1
      };

      store.departments.push(newDept);
      saveFallbackStore(store);

      res.status(201).json({ message: 'Department created successfully.', department: newDept });
    } catch (err) {
      res.status(500).json({ message: 'Error creating department.' });
    }
  }

  static async updateDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, head, active } = req.body;

    try {
      const store = loadFallbackStore();
      const idx = store.departments.findIndex(d => d.id === Number(id));

      if (idx === -1) {
        res.status(404).json({ message: 'Department not found.' });
        return;
      }

      if (name) store.departments[idx].name = name;
      if (head !== undefined) store.departments[idx].head = head;
      if (active !== undefined) store.departments[idx].active = Number(active);

      saveFallbackStore(store);
      res.status(200).json({ message: 'Department updated successfully.', department: store.departments[idx] });
    } catch (err) {
      res.status(500).json({ message: 'Error updating department.' });
    }
  }

  static async deleteDepartment(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const store = loadFallbackStore();
      const filtered = store.departments.filter(d => d.id !== Number(id));
      
      if (filtered.length === store.departments.length) {
        res.status(404).json({ message: 'Department not found.' });
        return;
      }

      store.departments = filtered;
      saveFallbackStore(store);
      res.status(200).json({ message: 'Department deleted successfully.' });
    } catch (err) {
      res.status(500).json({ message: 'Error deleting department.' });
    }
  }


  // ==========================================
  // 3. CATEGORY CRUD OPERATIONS
  // ==========================================

  static async getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = loadFallbackStore();
      res.status(200).json({ categories: store.categories || [] });
    } catch (err) {
      res.status(500).json({ message: 'Error retrieving complaint categories.' });
    }
  }

  static async createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { name, description } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Category name is required.' });
      return;
    }

    try {
      const store = loadFallbackStore();
      if (!store.categories) store.categories = [];

      const exists = store.categories.some(c => c.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        res.status(409).json({ message: 'Category already exists.' });
        return;
      }

      const newCat = {
        id: store.categories.length > 0 ? Math.max(...store.categories.map(c => c.id)) + 1 : 1,
        name,
        description: description || '',
        active: 1
      };

      store.categories.push(newCat);
      saveFallbackStore(store);

      res.status(201).json({ message: 'Category created successfully.', category: newCat });
    } catch (err) {
      res.status(500).json({ message: 'Error creating category.' });
    }
  }

  static async updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { name, description, active } = req.body;

    try {
      const store = loadFallbackStore();
      const idx = store.categories.findIndex(c => c.id === Number(id));

      if (idx === -1) {
        res.status(404).json({ message: 'Category not found.' });
        return;
      }

      if (name) store.categories[idx].name = name;
      if (description !== undefined) store.categories[idx].description = description;
      if (active !== undefined) store.categories[idx].active = Number(active);

      saveFallbackStore(store);
      res.status(200).json({ message: 'Category updated successfully.', category: store.categories[idx] });
    } catch (err) {
      res.status(500).json({ message: 'Error updating category.' });
    }
  }

  static async deleteCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const store = loadFallbackStore();
      const filtered = store.categories.filter(c => c.id !== Number(id));

      if (filtered.length === store.categories.length) {
        res.status(404).json({ message: 'Category not found.' });
        return;
      }

      store.categories = filtered;
      saveFallbackStore(store);
      res.status(200).json({ message: 'Category deleted successfully.' });
    } catch (err) {
      res.status(500).json({ message: 'Error deleting category.' });
    }
  }


  // ==========================================
  // 4. ANNOUNCEMENTS BROADCAST
  // ==========================================

  static async getAnnouncements(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = loadFallbackStore();
      const announcements = store.announcements || [];
      // Sort newest first
      announcements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.status(200).json({ announcements });
    } catch (err) {
      res.status(500).json({ message: 'Error retrieving announcements.' });
    }
  }

  static async createAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { title, content } = req.body;

    if (!title || !content) {
      res.status(400).json({ message: 'Title and content are required for broadcasting.' });
      return;
    }

    try {
      const store = loadFallbackStore();
      if (!store.announcements) store.announcements = [];

      const newAnn = {
        id: store.announcements.length > 0 ? Math.max(...store.announcements.map(a => a.id)) + 1 : 1,
        title,
        content,
        created_by: req.user?.name || 'Administrator',
        created_at: new Date().toISOString()
      };

      store.announcements.push(newAnn);

      // Broadcast notifications to all users in fallback store!
      store.users.forEach(u => {
        store.notifications.push({
          id: store.notifications.length > 0 ? Math.max(...store.notifications.map(n => n.id)) + 1 : 1,
          user_id: u.id,
          title: `Announcement: ${title}`,
          message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          is_read: 0,
          created_at: new Date().toISOString()
        });
      });

      saveFallbackStore(store);

      res.status(201).json({ message: 'Announcement broadcasted and notifications dispatched.', announcement: newAnn });
    } catch (err) {
      res.status(500).json({ message: 'Error broadcasting announcement.' });
    }
  }


  // ==========================================
  // 5. WORKFLOW OPERATIONS (Verify/Close & Reassign)
  // ==========================================

  // Admin approves resolution and Closes the complaint
  static async verifyAndCloseComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { feedback } = req.body;

    try {
      const store = loadFallbackStore();
      const idx = store.complaints.findIndex(c => c.id === Number(id));

      if (idx === -1) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }

      store.complaints[idx].status = 'Closed';
      store.complaints[idx].admin_feedback = feedback || 'Verified and closed by Administrator.';
      store.complaints[idx].updated_at = new Date().toISOString();

      // Notify Citizen
      store.notifications.push({
        id: store.notifications.length > 0 ? Math.max(...store.notifications.map(n => n.id)) + 1 : 1,
        user_id: store.complaints[idx].citizen_id,
        title: 'Complaint Closed & Resolved',
        message: `Your complaint ${store.complaints[idx].tracking_id} has been verified and successfully closed.`,
        is_read: 0,
        created_at: new Date().toISOString()
      });

      // Notify Assigned Officer
      if (store.complaints[idx].officer_id) {
        store.notifications.push({
          id: store.notifications.length > 0 ? Math.max(...store.notifications.map(n => n.id)) + 1 : 1,
          user_id: store.complaints[idx].officer_id,
          title: 'Resolution Verified',
          message: `The resolution for complaint ${store.complaints[idx].tracking_id} has been verified and closed.`,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }

      saveFallbackStore(store);

      res.status(200).json({ message: 'Complaint successfully verified and closed.', complaint: store.complaints[idx] });
    } catch (err) {
      console.error('Error verifying complaint:', err);
      res.status(500).json({ message: 'Error verifying complaint resolution.' });
    }
  }

  // Admin rejects resolution and Reassigns the complaint back to the officer
  static async reassignComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { feedback, officerId } = req.body;

    if (!feedback) {
      res.status(400).json({ message: 'Reassignment feedback/notes are required for re-evaluation.' });
      return;
    }

    try {
      const store = loadFallbackStore();
      const idx = store.complaints.findIndex(c => c.id === Number(id));

      if (idx === -1) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }

      // Revert status to 'In Progress' or 'Assigned'
      store.complaints[idx].status = 'In Progress';
      store.complaints[idx].admin_feedback = feedback;
      store.complaints[idx].resolution_notes = `[Reopened] Previous Resolution Rejected: ${feedback}`;
      
      if (officerId) {
        store.complaints[idx].officer_id = Number(officerId);
      }
      
      store.complaints[idx].updated_at = new Date().toISOString();

      // Notify Citizen
      store.notifications.push({
        id: store.notifications.length > 0 ? Math.max(...store.notifications.map(n => n.id)) + 1 : 1,
        user_id: store.complaints[idx].citizen_id,
        title: 'Complaint Re-opened',
        message: `Your complaint ${store.complaints[idx].tracking_id} is being re-evaluated for better resolution.`,
        is_read: 0,
        created_at: new Date().toISOString()
      });

      // Notify Officer
      if (store.complaints[idx].officer_id) {
        store.notifications.push({
          id: store.notifications.length > 0 ? Math.max(...store.notifications.map(n => n.id)) + 1 : 1,
          user_id: store.complaints[idx].officer_id,
          title: 'Complaint Reassigned for Re-work',
          message: `Complaint ${store.complaints[idx].tracking_id} needs rework: "${feedback}"`,
          is_read: 0,
          created_at: new Date().toISOString()
        });
      }

      saveFallbackStore(store);

      res.status(200).json({ message: 'Complaint reassigned back to officer with feedback.', complaint: store.complaints[idx] });
    } catch (err) {
      console.error('Error reassigning complaint:', err);
      res.status(500).json({ message: 'Error reassigning complaint.' });
    }
  }


  // ==========================================
  // 6. USERS LIST & MANAGEMENT
  // ==========================================

  static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const store = loadFallbackStore();
      // Exclude passwords
      const safeUsers = store.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        department: u.department,
        avatar: u.avatar,
        is_active: u.is_active === undefined ? 1 : u.is_active,
        created_at: u.created_at
      }));

      res.status(200).json({ users: safeUsers });
    } catch (err) {
      res.status(500).json({ message: 'Error retrieving users list.' });
    }
  }
}
