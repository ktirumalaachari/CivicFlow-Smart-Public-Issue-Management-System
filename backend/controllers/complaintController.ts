import { Request, Response } from 'express';
import { ComplaintModel, Complaint } from '../models/Complaint.ts';
import { UserModel } from '../models/User.ts';
import { AuthenticatedRequest } from '../middleware/auth.ts';
import { GoogleGenAI } from '@google/genai';
import { NotificationService } from '../services/NotificationService.ts';

export class ComplaintController {
  // 1. REGISTER NEW COMPLAINT (Citizen)
  static async registerComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized. Please login.' });
      return;
    }

    const { title, description, category, priority, location_lat, location_lng, location_name } = req.body;
    const file = req.file;

    if (!title || !description || !category) {
      res.status(400).json({ message: 'Title, description, and category are required fields.' });
      return;
    }

    try {
      const imageUrl = file ? `/uploads/${file.filename}` : null;

      const trackingId = await ComplaintModel.create({
        title,
        description,
        category,
        priority: priority || 'Medium',
        location_lat: location_lat ? Number(location_lat) : undefined,
        location_lng: location_lng ? Number(location_lng) : undefined,
        location_name: location_name || undefined,
        image_url: imageUrl || undefined,
        citizen_id: req.user.id
      });

      const comp = await ComplaintModel.findByTrackingId(trackingId);
      if (comp && comp.id) {
        // Auto-Verification
        await ComplaintModel.updateStatus(comp.id, 'Verified');
        
        // Intelligent Auto-Assignment to correct department officer
        const officers = await UserModel.findByRole('Officer');
        // Filter out suspended or pending officers
        const activeOfficers = officers.filter(u => u.department === category && u.status === 'ACTIVE');
        
        if (activeOfficers.length > 0) {
          const allComplaints = await ComplaintModel.findAll();
          const activeComplaints = allComplaints.filter(c => c.status !== 'Closed' && c.status !== 'Resolved' && c.status !== 'Submitted');
          
          let leastWorkload = Infinity;
          let assignedOfficerId: string | null = null;
          
          for (const officer of activeOfficers) {
             const workload = activeComplaints.filter(c => c.officer_id === officer.id).length;
             if (workload < leastWorkload) {
                leastWorkload = workload;
                assignedOfficerId = officer.id as string;
             }
          }
          if (assignedOfficerId) {
             await ComplaintModel.assignOfficer(comp.id, assignedOfficerId);
          }
        } else {
          // Keep unassigned. Create notification for admin.
          const admins = await UserModel.findByRole('Administrator');
          for (const admin of admins) {
            if (admin.id) {
               await ComplaintModel.createNotification(
                 admin.id,
                 'Unassigned Complaint Warning',
                 `Complaint ${trackingId} could not be automatically assigned. No active officers found in department: ${category}.`
               );
            }
          }
        }
      }

      res.status(201).json({
        message: 'Complaint submitted successfully and logged under tracking ID.',
        trackingId
      });

      if (req.user && req.user.id) {
        NotificationService.notifyUser(
          req.user.id,
          'Complaint Filed Successfully',
          `Your complaint ${trackingId} has been registered and is pending officer assignment.`
        );
      }
    } catch (err: any) {
      console.error('Error filing complaint:', err);
      res.status(500).json({ message: 'Internal Server Error occurred while filing complaint.' });
    }
  }

  // 2. GET ALL COMPLAINTS (Generic / Admin)
  static async getAllComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const list = await ComplaintModel.findAll();
      res.status(200).json({ complaints: list });
    } catch (err) {
      console.error('Error fetching complaints:', err);
      res.status(500).json({ message: 'Error retrieving complaints list.' });
    }
  }

  // 2a. GET COMPLAINT BY ID
  static async getComplaintById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const comp = await ComplaintModel.findById(Number(req.params.id));
      if (!comp) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }
      res.status(200).json({ complaint: comp });
    } catch (err) {
      console.error('Error fetching complaint:', err);
      res.status(500).json({ message: 'Error retrieving complaint.' });
    }
  }

  // 2b. GET CITIZEN COMPLAINTS
  static async getCitizenComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || req.user.role !== 'Citizen') {
      res.status(403).json({ message: 'Forbidden.' });
      return;
    }
    try {
      const list = await ComplaintModel.findByCitizen(req.user.id);
      res.status(200).json({ complaints: list });
    } catch (err) {
      console.error('Error fetching complaints:', err);
      res.status(500).json({ message: 'Error retrieving complaints list.' });
    }
  }

  // 2c. GET OFFICER COMPLAINTS
  static async getOfficerComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || req.user.role !== 'Officer') {
      res.status(403).json({ message: 'Forbidden.' });
      return;
    }
    try {
      const list = await ComplaintModel.findByOfficer(req.user.id);
      res.status(200).json({ complaints: list });
    } catch (err) {
      console.error('Error fetching complaints:', err);
      res.status(500).json({ message: 'Error retrieving complaints list.' });
    }
  }

  // 2d. GET ADMIN COMPLAINTS
  static async getAdminComplaints(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || req.user.role !== 'Administrator') {
      res.status(403).json({ message: 'Forbidden.' });
      return;
    }
    try {
      const list = await ComplaintModel.findAll();
      res.status(200).json({ complaints: list });
    } catch (err) {
      console.error('Error fetching complaints:', err);
      res.status(500).json({ message: 'Error retrieving complaints list.' });
    }
  }

  // 3. ADMIN ASSIGN COMPLAINT TO OFFICER
  static async assignOfficer(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { officerId } = req.body;

    if (!officerId) {
      res.status(400).json({ message: 'Officer selection is required.' });
      return;
    }

    try {
      // Validate officer role
      const officer = await UserModel.findById(String(officerId));
      if (!officer || officer.role !== 'Officer') {
        res.status(400).json({ message: 'Target user is not registered as a Department Officer.' });
        return;
      }

      const success = await ComplaintModel.assignOfficer(Number(id), String(officerId));
      const comp = await ComplaintModel.findById(Number(id));
      if (!success || !comp) {
        res.status(404).json({ message: 'Complaint record not found.' });
        return;
      }

      NotificationService.notifyUser(
        String(comp.citizen_id),
        'Complaint Assigned',
        `Your complaint ${comp.tracking_id} has been assigned to a department officer.`
      );
      
      NotificationService.notifyUser(
        String(officerId),
        'New Complaint Assigned',
        `A new complaint ${comp.tracking_id} has been assigned to you.`
      );

      res.status(200).json({ message: 'Officer successfully assigned to complaint.' });
    } catch (err) {
      console.error('Error assigning officer:', err);
      res.status(500).json({ message: 'Error saving officer assignment.' });
    }
  }

  // 4. OFFICER UPDATE STATUS
  static async updateStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
    if (!status || !allowedStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid status value.' });
      return;
    }

    try {
      const success = await ComplaintModel.updateStatus(Number(id), status);
      const comp = await ComplaintModel.findById(Number(id));
      if (!success || !comp) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }

      NotificationService.notifyUser(
        String(comp.citizen_id),
        `Status Updated: ${status}`,
        `Your complaint ${comp.tracking_id} is now in "${status}" state.`
      );

      res.status(200).json({ message: `Status updated successfully to ${status}.` });
    } catch (err) {
      console.error('Error updating status:', err);
      res.status(500).json({ message: 'Error writing status update.' });
    }
  }

  // 4b. OFFICER ACCEPT ASSIGNMENT
  static async acceptComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user || req.user.role !== 'Officer') {
      res.status(403).json({ message: 'Forbidden. Only registered Officers can accept complaints.' });
      return;
    }

    const { id } = req.params;

    try {
      const comp = await ComplaintModel.findById(Number(id));
      if (!comp) {
        res.status(404).json({ message: 'Complaint not found.' });
        return;
      }

      const success = await ComplaintModel.assignOfficer(Number(id), req.user.id);
      if (!success) {
        res.status(500).json({ message: 'Failed to accept assignment.' });
        return;
      }

      NotificationService.notifyUser(
        String(comp.citizen_id),
        'Complaint Assigned',
        `Your complaint ${comp.tracking_id} has been assigned to a department officer.`
      );

      res.status(200).json({ message: 'Assignment accepted successfully! It is now locked to your profile.' });
    } catch (err) {
      console.error('Error accepting assignment:', err);
      res.status(500).json({ message: 'Error processing assignment acceptance.' });
    }
  }

  // 5. OFFICER SUBMIT RESOLUTION
  static async resolveComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { resolution_notes } = req.body;
    const file = req.file;

    if (!resolution_notes) {
      res.status(400).json({ message: 'Resolution notes are required to close/resolve the issue.' });
      return;
    }

    try {
      const resolutionImage = file ? `/uploads/${file.filename}` : null;

      const success = await ComplaintModel.resolve(Number(id), resolution_notes, resolutionImage);
      const comp = await ComplaintModel.findById(Number(id));
      if (!success || !comp) {
        res.status(404).json({ message: 'Complaint record not found.' });
        return;
      }

      NotificationService.notifyUser(
        String(comp.citizen_id),
        'Complaint Resolved',
        `The status of your complaint ${comp.tracking_id} has been updated to "Resolved".`
      );

      res.status(200).json({ message: 'Complaint resolved and resolution details updated.' });
    } catch (err) {
      console.error('Error resolving complaint:', err);
      res.status(500).json({ message: 'Error saving complaint resolution.' });
    }
  }

  // 6. PUBLIC COMPLAINT SEARCH (Transparency Portal - No Auth Required)
  static async publicTrack(req: Request, res: Response): Promise<void> {
    const { trackingId } = req.params;

    if (!trackingId) {
      res.status(400).json({ message: 'Tracking ID is required.' });
      return;
    }

    try {
      const comp = await ComplaintModel.findByTrackingId(trackingId.trim());
      if (!comp) {
        res.status(404).json({ message: 'No complaint found matching the provided tracking ID.' });
        return;
      }

      // Hide PII (citizen details) for public transparency safety
      const sanitised = {
        tracking_id: comp.tracking_id,
        title: comp.title,
        category: comp.category,
        priority: comp.priority,
        location_name: comp.location_name,
        status: comp.status,
        resolution_notes: comp.resolution_notes,
        created_at: comp.created_at,
        updated_at: comp.updated_at,
        trackingHistory: comp.trackingHistory
      };

      res.status(200).json({ complaint: sanitised });
    } catch (err) {
      console.error('Error tracking complaint:', err);
      res.status(500).json({ message: 'Error retrieving tracking history.' });
    }
  }

  // 7. GET NOTIFICATIONS (User specific)
  static async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    try {
      const notifications = await ComplaintModel.getNotifications(req.user.id);
      res.status(200).json({ notifications });
    } catch (err) {
      res.status(500).json({ message: 'Error retrieving notifications.' });
    }
  }

  // 8. MARK ALL NOTIFICATIONS READ
  static async markNotificationsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    try {
      await ComplaintModel.markNotificationsRead(req.user.id);
      res.status(200).json({ message: 'All notifications marked as read.' });
    } catch (err) {
      res.status(500).json({ message: 'Error updating notification states.' });
    }
  }

  // 9. ANALYZE COMPLAINT VIA AI
  static async analyzeComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { title, description } = req.body;
    if (!title && !description) {
      res.status(400).json({ message: 'Title or description required for analysis.' });
      return;
    }

    const textToAnalyze = `Title: ${title || ''}\nDescription: ${description || ''}`;

    const fallbackKeywords = () => {
      const lowerText = textToAnalyze.toLowerCase();
      let category = 'Other';
      let priority = 'Low';
      let department = 'General';
      
      if (lowerText.includes('water') || lowerText.includes('leak') || lowerText.includes('pipe')) {
        category = 'Water';
        department = 'Water';
        priority = lowerText.includes('major') || lowerText.includes('flood') ? 'High' : 'Medium';
      } else if (lowerText.includes('light') || lowerText.includes('power') || lowerText.includes('electricity')) {
        category = 'Electricity';
        department = 'Electricity';
        priority = 'Medium';
      } else if (lowerText.includes('road') || lowerText.includes('pothole') || lowerText.includes('street')) {
        category = 'Road';
        department = 'Road';
        priority = 'Medium';
      } else if (lowerText.includes('waste') || lowerText.includes('garbage') || lowerText.includes('trash')) {
        category = 'Waste';
        department = 'Waste';
        priority = 'Medium';
      } else if (lowerText.includes('sanitation') || lowerText.includes('sewage') || lowerText.includes('drain')) {
        category = 'Sanitation';
        department = 'Sanitation';
        priority = 'High';
      } else if (lowerText.includes('traffic') || lowerText.includes('signal') || lowerText.includes('block')) {
        category = 'Traffic';
        department = 'Traffic';
        priority = 'High';
      }

      res.status(200).json({
        category,
        department,
        priority,
        keywords: [category.toLowerCase(), priority.toLowerCase(), 'auto-detected']
      });
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not set. Falling back to keyword matching.');
      fallbackKeywords();
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
        Analyze the following civic complaint and categorize it.
        Return ONLY a JSON object with these exact keys (no markdown formatting, just raw JSON):
        - "category": one of ["Road", "Water", "Electricity", "Sanitation", "Waste", "Traffic", "Health", "Other"]
        - "department": corresponding department name based on category
        - "priority": one of ["Low", "Medium", "High", "Critical"]
        - "keywords": an array of 3 to 5 relevant string keywords extracted from the text

        Complaint:
        ${textToAnalyze}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let jsonStr = response.text;
      if (!jsonStr) {
        throw new Error('Empty response from AI');
      }

      // Clean up markdown if present
      jsonStr = jsonStr.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(jsonStr);
      res.status(200).json(parsed);
    } catch (err) {
      console.error('AI Analysis failed, falling back to keywords:', err);
      fallbackKeywords();
      return;
    }
  }

  // 10. CHECK DUPLICATE COMPLAINT
  static async checkDuplicate(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const { title, description, category } = req.body;
    if (!title || !description || !category) {
      res.status(400).json({ message: 'Title, description, and category required.' });
      return;
    }

    try {
      const allComplaints = await ComplaintModel.findAll();
      // Filter by category to narrow down
      const categoryComplaints = allComplaints.filter(c => c.category === category && c.status !== 'Closed');

      let maxSimilarity = 0;
      let duplicateComplaint = null;

      const tokenize = (text: string) => {
        return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
      };

      const newText = `${title} ${description}`;
      const newTokens = tokenize(newText);

      for (const comp of categoryComplaints) {
        const compText = `${comp.title} ${comp.description}`;
        const compTokens = tokenize(compText);

        const intersection = new Set([...newTokens].filter(x => compTokens.has(x)));
        const union = new Set([...newTokens, ...compTokens]);

        const similarity = intersection.size / (union.size || 1);
        if (similarity > maxSimilarity) {
          maxSimilarity = similarity;
          duplicateComplaint = comp;
        }
      }

      // Check threshold > 0.8
      if (maxSimilarity > 0.8 && duplicateComplaint) {
        res.status(200).json({ isDuplicate: true, duplicate: duplicateComplaint, similarity: maxSimilarity });
      } else {
        res.status(200).json({ isDuplicate: false });
      }
    } catch (err) {
      console.error('Duplicate check failed:', err);
      res.status(500).json({ message: 'Duplicate check failed.' });
    }
  }

  // 11. SUPPORT COMPLAINT
  static async supportComplaint(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized.' });
      return;
    }

    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      res.status(400).json({ message: 'Invalid complaint ID.' });
      return;
    }

    try {
      const success = await ComplaintModel.incrementSupport(id);
      if (success) {
        res.status(200).json({ message: 'Complaint supported successfully.' });
      } else {
        res.status(404).json({ message: 'Complaint not found.' });
      }
    } catch (err) {
      console.error('Support failed:', err);
      res.status(500).json({ message: 'Failed to support complaint.' });
    }
  }
}
