// This file tells Jest to use a "fake" version of the voice library
// so our tests can run without the real native module.
export default {
  start: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn().mockResolvedValue(),
  removeAllListeners: jest.fn(),
  onSpeechStart: jest.fn(),
  onSpeechEnd: jest.fn(),
  onSpeechError: jest.fn(),
  onSpeechResults: jest.fn(),
  onSpeechPartialResults: jest.fn(),
};
