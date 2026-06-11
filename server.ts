/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Read .env configuration
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini Client Lazily & Safely to avoid crashing if key is not provided yet
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY is not configured yet or has placeholder value.");
      return null;
    }
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // --- API ROUTE: AI Summary Generator ---
  app.post('/api/generate-summary', async (req, res) => {
    const { name, jobTitle, inputPrompt, lang } = req.body;
    const ai = getGeminiClient();

    const backupAr = `أخصائي متميز في مجال ${jobTitle || 'التطوير الإداري والفني'}، يمتلك مهارات استثنائية وخبرة عملية تركز على الابتكار والتحسين المستمر، مع القدرة على قيادة المشاريع وحل المشكلات المعقدة بكفاءة وجودة عالية لتحقيق الأهداف المؤسسية.`;
    const backupEn = `A highly motivated and results-oriented ${jobTitle || 'specialist'} with a proven track record of driving operational efficiency and continuous optimization. Skilled at designing unified solutions for complex challenges and elevating corporate performance.`;

    if (!ai) {
      // Warm response if API isn't initialized yet
      console.log("Serving offline local summary template.");
      return res.json({
        summary: (lang === 'ar' ? backupAr : backupEn) + " (Offline Mode)"
      });
    }

    try {
      const isAr = lang === 'ar';
      const prompt = `Compose a highly professional CV profile summary in ${isAr ? 'Arabic' : 'English'}.
User details:
Target Job Title: ${jobTitle}
Aspiration/Keywords: ${inputPrompt || 'Seeking high efficiency growth and collaboration'}

CRITICAL GUIDELINES:
1. Do NOT mention any person's name (such as "${name}").
2. Do NOT use first-person statements (such as "I am", "My name is", "My experience", "أنا", "اسمي").
3. Write in the third person or as standard professional resume profile statements (e.g., beginning with adjectives or nouns, e.g. "Dedicated ${jobTitle} with custom expertise...").
4. Write exactly 2 to 3 polished sentences capturing core work ethics, skillsets, and professional value. Do not give any introductory boilerplate, write the raw summary directly.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
      });

      const summaryText = response.text?.trim() || (isAr ? backupAr : backupEn);
      res.json({ summary: summaryText });
    } catch (err: any) {
      console.error("Gemini API execution error: ", err);
      res.json({
        summary: (lang === 'ar' ? backupAr : backupEn),
        error: err.message
      });
    }
  });

  // --- API ROUTE: Health check & key presence details ---
  app.get('/api/status', (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
    res.json({
      status: "online",
      geminiConfigured: hasKey,
      time: new Date().toISOString()
    });
  });

  // Serve static UI assets for the app preview
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting production mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CV AI Backend] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start full stack CV AI server: ", err);
});
