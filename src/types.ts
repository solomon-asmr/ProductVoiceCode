export interface Product {
  name: string;
  id: string;
}

export interface VoiceState {
  isListening: boolean;
  partialTranscript: string;
  finalTranscript: string;
  error: string;
  foundProduct: Product | null | 'not_found';
}
