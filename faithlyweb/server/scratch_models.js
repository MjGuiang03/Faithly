import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config({ path: '../server/.env' }); // Make sure it finds the right .env

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  console.log('Using API Key ending in:', process.env.GEMINI_API_KEY.slice(-6));
  try {
    // We can fetch from REST directly to see what models are available
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    const models = data.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name);
    console.log('Available models for this API key:');
    models.forEach(m => console.log(' - ' + m));
  } catch (e) {
    console.error('Error fetching models:', e);
  }
}

listModels();
