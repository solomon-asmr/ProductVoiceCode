export interface Product {
  name: string;
  id: string;
}

export interface VoiceState {
  isListening: boolean;
  partialTranscript: string;
  finalTranscript: string;
  error: string;
  // CHANGED: Now supports a single Product, an Array of Products, or null
  foundProduct: Product | Product[] | null | 'not_found';
}
