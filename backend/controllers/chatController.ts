import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { ComplaintModel } from '../models/Complaint.ts';

export class ChatController {
  static async handleChat(req: Request, res: Response): Promise<void> {
    try {
      const { message, history, userId } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
        return;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Fetch user's complaints if userId is provided
      let userContext = '';
      if (userId) {
        const allComplaints = await ComplaintModel.findAll();
        const complaints = allComplaints.filter((c: any) => c.citizen_id === userId);
        
        if (complaints && complaints.length > 0) {
          userContext = `\nThe user is currently logged in. Here are their active and past complaints:\n` +
            complaints.map((c: any) => `- ID: ${c.tracking_id} | Title: ${c.title} | Status: ${c.status} | Priority: ${c.priority} | Category: ${c.category}`).join('\n');
        } else {
          userContext = `\nThe user is logged in but has no registered complaints.`;
        }
      } else {
        userContext = `\nThe user is anonymous/guest.`;
      }

      const systemPrompt = `You are CivicBot, a friendly and professional AI assistant for the CivicFlow municipal complaint system. 
You can answer FAQs, track complaints, suggest departments, summarize complaints, and seamlessly translate between Indian languages.
If the user asks in an Indian language (like Hindi, Tamil, Telugu, etc.), detect it and reply in the same language. 
If they want to register a new complaint, output a JSON block exactly like this:
\`\`\`json
{"action": "register", "details": {"title": "extracted title", "category": "extracted category", "description": "extracted desc"}}
\`\`\`
Only output the JSON if they gave enough details to register a complaint. Otherwise, ask them for the details (title, category, description) or tell them to use the 'File a Complaint' button.
If they want to track a complaint, check their history. If it's not in the history context provided below, ask for the tracking ID.
${userContext}

Keep your responses concise, helpful, and professionally friendly. Use markdown formatting where appropriate.`;

      const formattedHistory = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood. I am CivicBot and I am ready to assist citizens." }] }
      ];

      if (history && Array.isArray(history)) {
        history.forEach(msg => {
          formattedHistory.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        });
      }

      // Append the latest user message
      formattedHistory.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: formattedHistory
      });

      res.status(200).json({ reply: response.text });
    } catch (error: any) {
      console.error('[ChatController] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to process chat request' });
    }
  }
}
