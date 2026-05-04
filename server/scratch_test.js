import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '../server/.env', override: true });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGeneration(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say 'hello world'");
    console.log(`✅ Success with ${modelName}:`, result.response.text());
    return true;
  } catch (e) {
    console.log(`❌ Failed with ${modelName}:`, e.message);
    return false;
  }
}

async function run() {
  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash-lite', 'gemini-flash-lite-latest'];
  for (const m of models) {
    const success = await testGeneration(m);
    if (success) break;
  }
}

run();
