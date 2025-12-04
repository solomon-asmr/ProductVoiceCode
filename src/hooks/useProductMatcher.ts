import {Product} from '../types';
import productData from '../data/products.json';

// Helper function to clean Hebrew text
// 1. Trims whitespace
// 2. Replaces "Start" notation
// 3. Converts double Yud (יי) to single Yud (י) to fix spelling mismatches
const normalizeHebrew = (text: string): string => {
  return text
    .trim()
    .replace(/יי/g, 'י') // Treat "עגבנייה" and "עגבניה" as the same
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
    .toLowerCase();
};

// Sort products by length (Longest first) for the partial match phase
const sortedProducts = [...productData].sort(
  (a, b) => b.name.length - a.name.length,
);

/**
 * Finds a product from the static list based on a spoken transcript.
 * @param transcript The speech-to-text transcript.
 * @returns A matching Product, or null if no match.
 */
export const findProduct = (transcript: string): Product | null => {
  if (!transcript) return null;

  const cleanTranscript = normalizeHebrew(transcript);

  // --- PHASE 1: EXACT MATCH (High Priority) ---
  // If the user said EXACTLY "בצל", we must return "בצל",
  // even if "בצל אדום" exists and is longer.
  const exactMatch = productData.find(
    p => normalizeHebrew(p.name) === cleanTranscript,
  );

  if (exactMatch) {
    return exactMatch;
  }

  // --- PHASE 2: PARTIAL MATCH (Smart Search) ---
  // If we didn't find an exact match, look for phrases inside the text.
  // We use the sorted list (Longest First) here.
  // Example: "אני רוצה בצל אדום" -> matches "בצל אדום" before "בצל".
  for (const product of sortedProducts) {
    const cleanProductName = normalizeHebrew(product.name);

    // Check if the transcript INCLUDES the product name
    if (cleanTranscript.includes(cleanProductName)) {
      return product;
    }

    // Note: I removed the reverse check (product includes transcript)
    // because that caused "בצל" to match "בצל אדום".
  }

  return null;
};
