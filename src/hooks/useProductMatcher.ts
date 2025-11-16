import {Product} from '../types';
import productData from '../data/products.json';

// Load products into a map for fast, case-insensitive lookup
const productMap = new Map<string, Product>();
productData.forEach(product => {
  productMap.set(product.name.trim().toLowerCase(), product);
});

/**
 * Finds a product from the static list based on a spoken transcript.
 * @param transcript The speech-to-text transcript.
 * @returns A matching Product, or null if no match.
 */
export const findProduct = (transcript: string): Product | null => {
  const cleanTranscript = transcript.trim().toLowerCase();
  return productMap.get(cleanTranscript) || null;
};
