import { Response } from 'express';
import { ComplaintModel } from '../models/Complaint.ts';
import { UserModel } from '../models/User.ts';

class NotificationServiceClass {
  private clients: Map<string, Response[]> = new Map();

  // SSE Client Management
  public addClient(userId: string, res: Response) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    this.clients.get(userId)!.push(res);
    
    // Send initial connection heartbeat
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);
  }

  public removeClient(userId: string, res: Response) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      this.clients.set(userId, userClients.filter(c => c !== res));
      if (this.clients.get(userId)!.length === 0) {
        this.clients.delete(userId);
      }
    }
  }

  // Multi-Channel Dispatcher
  public async notifyUser(userId: string, title: string, message: string) {
    try {
      // 1. Save to DB (History)
      await ComplaintModel.createNotification(userId, title, message);

      // 2. Real-time Push (Toast via SSE)
      const userClients = this.clients.get(userId);
      if (userClients && userClients.length > 0) {
        const payload = JSON.stringify({ type: 'notification', title, message });
        userClients.forEach(res => {
          try {
            res.write(`data: ${payload}\n\n`);
          } catch (e) {
            console.error('SSE send error', e);
          }
        });
      }

      // 3. Email & WhatsApp (Mock Output)
      // Normally we'd use Twilio / Nodemailer here. For now we use structured logging.
      const user = await UserModel.findById(userId);
      if (user) {
        console.log('\n--- EXTERNAL NOTIFICATION DISPATCH (Mock) ---');
        console.log(`[EMAIL] To: ${user.email} | Subject: ${title}`);
        console.log(`[EMAIL BODY] ${message}`);
        
        if (user.phone) {
          console.log(`[WHATSAPP] To: ${user.phone} | Msg: *${title}* - ${message}`);
        } else {
          console.log(`[WHATSAPP] Skipped: No phone number registered for ${user.email}`);
        }
        console.log('---------------------------------------------\n');
      }

    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    }
  }
}

export const NotificationService = new NotificationServiceClass();
