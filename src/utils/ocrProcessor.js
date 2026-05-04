import { createWorker } from 'tesseract.js';

/**
 * Normalizes text for better matching (lowercase, alphanumeric only)
 */
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Extracts text from an image and checks for a name match
 * @param {string} imageBase64 - Base64 image data
 * @param {string} targetName - The name to search for
 * @returns {Promise<{
 *   text: string,
 *   isMatch: boolean,
 *   confidence: number,
 *   error?: string
 * }>}
 */
export const performOCRScan = async (imageBase64, targetName) => {
  let worker = null;
  try {
    worker = await createWorker('eng');
    
    // Perform recognition
    const { data: { text, confidence } } = await worker.recognize(imageBase64);
    
    // Normalize names for comparison
    const normalizedExtracted = normalize(text);
    const normalizedTarget = normalize(targetName);
    
    // Check if parts of the name exist in the extracted text
    // (splitting by space to handle multi-part names)
    const nameParts = targetName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
    const matchCount = nameParts.filter(part => normalizedExtracted.includes(normalize(part))).length;
    
    // Logic: If at least 70% of name parts are found, or the full normalized target exists
    const isNameMatch = normalizedExtracted.includes(normalizedTarget) || (nameParts.length > 0 && matchCount / nameParts.length >= 0.6);
    
    await worker.terminate();
    
    return {
      text,
      isMatch: isNameMatch,
      confidence,
    };
  } catch (error) {
    if (worker) await worker.terminate();
    console.error('OCR Error:', error);
    return {
      text: '',
      isMatch: false,
      confidence: 0,
      error: error.message
    };
  }
};
