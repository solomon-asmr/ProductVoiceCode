import {Product} from '../types';
import productData from '../data/products.json';

// Helper function to clean Hebrew text
const normalizeHebrew = (text: string): string => {
  return text
    .trim()
    .replace(/יי/g, 'י') // Treat "עגבנייה" and "עגבניה" as the same
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
    .toLowerCase();
};

// Helper to generate singular/plural variations
// Example: "עגבניות" -> returns ["עגבניות", "עגבניה"]
// Example: "בננה" -> returns ["בננה", "בננות"]
const getHebrewVariations = (text: string): string[] => {
  const variations = new Set<string>([text]);

  // Handle 'ot' (ות) <-> 'ah' (ה) suffix (Common Feminine Plural/Singular)
  if (text.endsWith('ות')) {
    // Plural to Singular: עגבניות -> עגבניה
    variations.add(text.slice(0, -2) + 'ה');
    variations.add(text.slice(0, -2)); // Sometimes singular has no suffix
  } else if (text.endsWith('ה')) {
    // Singular to Plural: בננה -> בננות
    variations.add(text.slice(0, -1) + 'ות');
  }

  // Handle 'im' (ים) suffix (Common Masculine Plural)
  if (text.endsWith('ים')) {
    // Plural to Singular: תפוחים -> תפוח
    variations.add(text.slice(0, -2));
  } else {
    // Singular to Plural: תפוח -> תפוחים
    variations.add(text + 'ים');
  }

  return Array.from(variations);
};

// Sort products by length (Longest first)
const sortedProducts = [...productData].sort(
  (a, b) => b.name.length - a.name.length,
);

export const findProduct = (transcript: string): Product[] | null => {
  if (!transcript) return null;

  const cleanTranscript = normalizeHebrew(transcript);

  // Generate all possible versions of what the user said
  // e.g. user said "עגבניות", we also look for "עגבניה"
  const transcriptVariations = getHebrewVariations(cleanTranscript);

  // --- PHASE 1: EXACT MATCH & GRAMMAR MATCH (Highest Priority) ---
  // Check if ANY of our variations matches a product name exactly.
  for (const variation of transcriptVariations) {
    const exactMatch = productData.find(
      p => normalizeHebrew(p.name) === variation,
    );
    if (exactMatch) {
      return [exactMatch];
    }
  }

  // --- PHASE 2: SPECIFIC INTENT (Medium Priority) ---
  // Check if the product name is contained inside any of our variations
  // or vice versa.
  for (const product of sortedProducts) {
    const cleanProductName = normalizeHebrew(product.name);

    // Check against all variations (Singular/Plural)
    for (const variation of transcriptVariations) {
      if (variation.includes(cleanProductName)) {
        return [product];
      }
    }
  }

  // --- PHASE 3: CATEGORY SEARCH (Broad Priority) ---
  // Find EVERYTHING that contains the word (or its variations).
  // Example: User says "עגבניות" -> Variation is "עגבניה" -> Matches "עגבניות שרי"
  let categoryMatches: Product[] = [];

  for (const variation of transcriptVariations) {
    const matches = productData.filter(product => {
      const cleanProductName = normalizeHebrew(product.name);
      return cleanProductName.includes(variation);
    });
    categoryMatches = [...categoryMatches, ...matches];
  }

  // Remove duplicates (in case "עגבניה" and "עגבניות" matched the same item)
  const uniqueMatches = Array.from(new Set(categoryMatches.map(p => p.id))).map(
    id => categoryMatches.find(p => p.id === id)!,
  );

  if (uniqueMatches.length > 0) {
    return uniqueMatches;
  }

  return null;
};
