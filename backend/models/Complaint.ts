import * as db from '../middleware/db.ts';

export interface ComplaintTracking {
  id: number;
  complaint_id: number;
  status: string;
  officer_name: string | null;
  remarks: string | null;
  created_at: string;
}

export interface Complaint {
  id?: number;
  tracking_id: string;
  title: string;
  description: string;
  category: 'Road' | 'Water' | 'Electricity' | 'Sanitation' | 'Waste' | 'Traffic' | 'Health' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  image_url?: string;
  status: 'Submitted' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  citizen_id: string;
  officer_id?: string;
  resolution_notes?: string;
  resolution_image?: string;
  supports?: number;
  created_at?: string;
  updated_at?: string;

  // Joined fields
  citizen_name?: string;
  citizen_email?: string;
  citizen_phone?: string;
  officer_name?: string;
  officer_email?: string;
  officer_phone?: string;
  officer_department?: string;

  trackingHistory?: ComplaintTracking[];
}

export class ComplaintModel {
  static async generateTrackingId(): Promise<string> {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digit unique number
    return `CF-${year}-${randomNum}`;
  }

  private static async populateTracking(complaints: Complaint[]): Promise<Complaint[]> {
    for (const comp of complaints) {
      if (comp.id) {
        comp.trackingHistory = await this.getTracking(comp.id);
      }
    }
    return complaints;
  }

  static async findById(id: number): Promise<Complaint | null> {
    const rows = await db.query('SELECT * FROM complaints WHERE id = ?', [id]);
    if (rows.length > 0) {
      const populated = await this.populateTracking(rows);
      return populated[0];
    }
    return null;
  }

  static async findByTrackingId(trackingId: string): Promise<Complaint | null> {
    const rows = await db.query('SELECT * FROM complaints WHERE tracking_id = ?', [trackingId]);
    if (rows.length > 0) {
      const populated = await this.populateTracking(rows);
      return populated[0];
    }
    return null;
  }

  static async findByCitizen(citizenId: string): Promise<Complaint[]> {
    const rows = await db.query('SELECT * FROM complaints WHERE citizen_id = ? ORDER BY created_at DESC', [citizenId]);
    return await this.populateTracking(rows);
  }

  static async findByOfficer(officerId: string): Promise<Complaint[]> {
    const rows = await db.query('SELECT * FROM complaints WHERE officer_id = ? ORDER BY created_at DESC', [officerId]);
    return await this.populateTracking(rows);
  }

  static async findAll(): Promise<Complaint[]> {
    const rows = await db.query('SELECT * FROM complaints ORDER BY created_at DESC');
    return await this.populateTracking(rows);
  }

  static async create(complaint: Partial<Complaint>): Promise<string> {
    const trackingId = await this.generateTrackingId();
    const result = await db.query(
      'INSERT INTO complaints (tracking_id, title, description, category, priority, location_lat, location_lng, location_name, image_url, citizen_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        trackingId,
        complaint.title,
        complaint.description,
        complaint.category,
        complaint.priority || 'Medium',
        complaint.location_lat || null,
        complaint.location_lng || null,
        complaint.location_name || null,
        complaint.image_url || null,
        complaint.citizen_id
      ]
    );
    
    // Support local JSON and MySQL responses
    const insertId = Array.isArray(result) ? (result as any).insertId : result.insertId;
    if (insertId) {
      await this.logTrackingUpdate(insertId, 'Submitted', 'System', 'Complaint submitted successfully by Citizen.');
    }

    return trackingId;
  }

  static async assignOfficer(id: number, officerId: string, officerName?: string): Promise<boolean> {
    const result = await db.query(
      'UPDATE complaints SET officer_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [officerId, 'Assigned', id]
    );
    if (result.affectedRows > 0) {
      await this.logTrackingUpdate(id, 'Assigned', officerName || 'System', 'Complaint assigned to department officer.');
      return true;
    }
    return false;
  }

  static async updateStatus(id: number, status: string, officerName?: string, remarks?: string): Promise<boolean> {
    const result = await db.query(
      'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, id]
    );
    if (result.affectedRows > 0) {
      await this.logTrackingUpdate(id, status, officerName || 'System', remarks || `Status updated to ${status}`);
      return true;
    }
    return false;
  }

  static async resolve(id: number, notes: string, imageUrl: string | null, officerName?: string): Promise<boolean> {
    const result = await db.query(
      'UPDATE complaints SET status = ?, resolution_notes = ?, resolution_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['Resolved', notes, imageUrl, id]
    );
    if (result.affectedRows > 0) {
      await this.logTrackingUpdate(id, 'Resolved', officerName || 'System', notes);
      return true;
    }
    return false;
  }

  static async incrementSupport(id: number): Promise<boolean> {
    const result = await db.query(
      'UPDATE complaints SET supports = supports + 1 WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async getNotifications(userId: string): Promise<any[]> {
    return await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  }

  static async logTrackingUpdate(complaintId: number, status: string, officerName: string, remarks: string | null): Promise<void> {
    await db.query(
      'INSERT INTO complaint_tracking (complaint_id, status, officer_name, remarks) VALUES (?, ?, ?, ?)',
      [complaintId, status, officerName, remarks]
    );
  }

  static async getTracking(complaintId: number): Promise<ComplaintTracking[]> {
    return await db.query('SELECT * FROM complaint_tracking WHERE complaint_id = ? ORDER BY created_at ASC', [complaintId]);
  }

  static async markNotificationsRead(userId: string): Promise<void> {
    await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  }

  static async createNotification(userId: string, title: string, message: string): Promise<void> {
    await db.query(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [userId, title, message]
    );
  }
}
