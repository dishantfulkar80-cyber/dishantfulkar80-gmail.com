import { Injectable, signal } from '@angular/core';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TutorService {
  private ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  private model = "gemini-3.1-pro-preview";
  
  messages = signal<Message[]>([]);
  isLoading = signal<boolean>(false);

  private systemInstruction = `You are a compassionate, Socratic math tutor. Your goal is to help students understand math concepts by guiding them through problems step-by-step.
1. NEVER give the full answer immediately.
2. When a student uploads an image or asks a question, identify the problem and explain only the FIRST step.
3. Ask the student if they understand or if they want to try the next part.
4. If the student asks 'Why did we do that?', explain the underlying concept clearly and patiently.
5. Use a warm, encouraging tone.
6. If the student is stuck, provide a small hint rather than the solution.
7. Use LaTeX-style formatting for math expressions (e.g., use $ for inline and $$ for blocks).
8. Be patient and supportive. If the student makes a mistake, gently guide them to see where they went wrong.`;

  async sendMessage(text: string, imageBase64?: string) {
    const newMessage: Message = { role: 'user', text };
    if (imageBase64) {
      newMessage.image = imageBase64;
    }
    
    this.messages.update(msgs => [...msgs, newMessage]);
    this.isLoading.set(true);

    try {
      const history = this.messages().map(m => ({
        role: m.role,
        parts: m.image ? [
          { inlineData: { data: m.image.split(',')[1], mimeType: 'image/png' } },
          { text: m.text || "Analyze this math problem." }
        ] : [{ text: m.text }]
      }));

      // We use generateContent instead of chat for simpler multimodal history handling in this specific flow
      // or we can use the chat API if we structure it right. 
      // Given the requirement for "thinking mode" and "image analysis", we'll use generateContent.
      
      const contents = history;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: contents,
        config: {
          systemInstruction: this.systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      const responseText = response.text || "I'm sorry, I couldn't process that. Could you try rephrasing or uploading a clearer image?";
      this.messages.update(msgs => [...msgs, { role: 'model', text: responseText }]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      this.messages.update(msgs => [...msgs, { role: 'model', text: "Oh dear, I seem to be having a bit of trouble connecting. Let's try that again in a moment." }]);
    } finally {
      this.isLoading.set(false);
    }
  }

  clearHistory() {
    this.messages.set([]);
  }
}
