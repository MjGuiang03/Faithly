import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '../server/.env', override: true });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testInsights() {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const systemPrompt = `You are a church management analytics advisor for the Philippine United Apostolic Church (PUAC).
Given the following operational data, provide exactly 5 insights as a JSON array of objects.
Each object must have: "icon" (single emoji), "title" (short 5-8 word title), "detail" (1-2 sentence actionable insight with specific numbers).
Focus on: trends, anomalies, actionable recommendations, and comparisons.
Respond ONLY with the JSON array, no markdown fences, no other text.`;

  const metricsText = `Members: 100\nDonations: 5000\nLoans: 10`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: metricsText }] }],
      systemInstruction: systemPrompt,
      generationConfig: { temperature: 0.6, responseMimeType: 'application/json' }
    });
    const text = result.response.text();
    console.log("FINISH REASON:", result.response.candidates[0].finishReason);
    console.log("RAW RESPONSE:");
    console.log(text);
    
    // Test cleaning
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    JSON.parse(cleaned);
    console.log("PARSE SUCCESS!");
  } catch(e) {
    console.error("ERROR:", e);
  }
}
testInsights();
