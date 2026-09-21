import { Response } from 'express';
import { UserModel } from '../models/User.ts';
import { ComplaintModel } from '../models/Complaint.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';

export class OfficerController {
  // GET /api/officers/workload
  static async getWorkload(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || (req.user.role !== 'Administrator' && req.user.role !== 'ADMIN')) {
      res.status(403).json({ message: 'Forbidden. Admin access required.' });
      return;
    }

    try {
      const allOfficers = await UserModel.findByRole('Officer');
      const allComplaints = await ComplaintModel.findAll();
      
      const activeComplaints = allComplaints.filter(
        c => c.status !== 'Closed' && c.status !== 'Resolved' && c.status !== 'Submitted'
      );

      const workloadData = allOfficers.map(officer => {
        const assignedComplaints = activeComplaints.filter(c => c.officer_id === officer.id);
        return {
          id: officer.id,
          name: officer.name,
          email: officer.email,
          department: officer.department,
          status: officer.status,
          activeWorkload: assignedComplaints.length,
          complaints: assignedComplaints.map(c => ({
            id: c.id,
            tracking_id: c.tracking_id,
            title: c.title,
            status: c.status
          }))
        };
      });

      res.status(200).json({ workload: workloadData });
    } catch (err) {
      console.error('Error fetching officer workload:', err);
      res.status(500).json({ message: 'Error retrieving officer workload.' });
    }
  }

  // GET /api/officers/available
  static async getAvailable(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || (req.user.role !== 'Administrator' && req.user.role !== 'ADMIN')) {
      res.status(403).json({ message: 'Forbidden. Admin access required.' });
      return;
    }

    try {
      const officers = await UserModel.findByRole('Officer');
      const activeOfficers = officers.filter(u => u.status === 'ACTIVE');
      
      // Also attach current workload to help admin decide
      const allComplaints = await ComplaintModel.findAll();
      const activeComplaints = allComplaints.filter(
        c => c.status !== 'Closed' && c.status !== 'Resolved' && c.status !== 'Submitted'
      );

      const availableData = activeOfficers.map(officer => {
         const workload = activeComplaints.filter(c => c.officer_id === officer.id).length;
         return {
           id: officer.id,
           name: officer.name,
           department: officer.department,
           activeWorkload: workload
         };
      });

      res.status(200).json({ officers: availableData });
    } catch (err) {
      console.error('Error fetching available officers:', err);
      res.status(500).json({ message: 'Error retrieving available officers.' });
    }
  }

  // PUT /api/complaints/:id/reassign
  static async reassignComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || (req.user.role !== 'Administrator' && req.user.role !== 'ADMIN')) {
      res.status(403).json({ message: 'Forbidden. Admin access required.' });
      return;
    }

    const { id } = req.params;
    const { officerId } = req.body;

    if (!officerId) {
      res.status(400).json({ message: 'Officer selection is required.' });
      return;
    }

    try {
      const officer = await UserModel.findById(String(officerId));
      if (!officer || officer.role !== 'Officer' || officer.status !== 'ACTIVE') {
        res.status(400).json({ message: 'Target user is not an active Department Officer.' });
        return;
      }

      const comp = await ComplaintModel.findById(Number(id));
      if (!comp) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }

      const success = await ComplaintModel.assignOfficer(Number(id), String(officerId));
      if (!success) {
        res.status(500).json({ message: 'Failed to reassign complaint.' });
        return;
      }
      
      // Add notification for the new officer
      await ComplaintModel.createNotification(
        String(officerId),
        'Complaint Reassigned',
        `Complaint ${comp.tracking_id} has been manually assigned to you by an administrator.`
      );

      res.status(200).json({ message: 'Complaint reassigned successfully.' });
    } catch (err) {
      console.error('Error reassigning complaint:', err);
      res.status(500).json({ message: 'Error reassigning complaint.' });
    }
  }
}
