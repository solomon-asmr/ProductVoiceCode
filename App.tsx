import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid,
  AccessibilityInfo,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';
import {findProduct} from './src/hooks/useProductMatcher';
import {Product, VoiceState} from './src/types';

// Initial state
const initialState: VoiceState = {
  isListening: false,
  partialTranscript: '',
  finalTranscript: '',
  error: '',
  foundProduct: null,
};

const App = () => {
  const [voiceState, setVoiceState] = useState<VoiceState>(initialState);

  // --- Voice Event Handlers ---

  const onSpeechStart = (e: SpeechStartEvent) => {
    console.log('onSpeechStart:', e);
    setVoiceState(prev => ({...prev, isListening: true, error: ''}));
  };

  const onSpeechEnd = () => {
    console.log('onSpeechEnd');
    setVoiceState(prev => ({...prev, isListening: false}));
  };

  const onSpeechError = (e: SpeechErrorEvent) => {
    console.error('onSpeechError:', e);
    // iOS frequently throws "Speech recognition unavailable" error if network is bad
    // or if the mic is used by another app.
    const errorMessage = e.error?.message || 'Unknown speech error';
    setVoiceState(prev => ({
      ...prev,
      error: errorMessage,
      isListening: false,
    }));
  };

  const onSpeechResults = (e: SpeechResultsEvent) => {
    console.log('onSpeechResults:', e);
    const transcript = e.value?.[0] || '';
    const product = findProduct(transcript);

    setVoiceState(prev => ({
      ...prev,
      finalTranscript: transcript,
      foundProduct: product || 'not_found',
      partialTranscript: '',
      isListening: false,
    }));

    // Announce result for accessibility
    const resultText = product
      ? `Found: ${product.name}, ID: ${product.id}`
      : 'Product not found';
    AccessibilityInfo.announceForAccessibility(resultText);
  };

  const onSpeechPartialResults = (e: SpeechResultsEvent) => {
    console.log('onSpeechPartialResults:', e);
    setVoiceState(prev => ({
      ...prev,
      partialTranscript: e.value?.[0] || '',
    }));
  };

  // --- useEffect for Setup & Teardown ---

  useEffect(() => {
    // Register all event listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

    // Cleanup: remove all listeners
    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- Actions ---

  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'ProductVoiceCode Microphone Permission',
            message:
              'This app needs microphone access to search for products by voice.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    // iOS permissions are handled by the Info.plist and the library
    return true;
  };

  const toggleListening = async () => {
    if (voiceState.isListening) {
      try {
        await Voice.stop();
        setVoiceState(prev => ({...prev, isListening: false}));
      } catch (e) {
        console.error('Failed to stop recording:', e);
        setVoiceState(prev => ({...prev, error: (e as Error).message}));
      }
    } else {
      const hasPermission = await requestAudioPermission();
      if (!hasPermission) {
        setVoiceState(prev => ({
          ...prev,
          error: 'Microphone permission was denied.',
        }));
        return;
      }

      // Reset state before starting
      setVoiceState({
        ...initialState,
        isListening: true, // Set listening true immediately
      });

      try {
        // 'en-US' is a common default, adjust as needed
        await Voice.start('en-US');
      } catch (e) {
        console.error('Failed to start recording:', e);
        setVoiceState(prev => ({
          ...prev,
          error: (e as Error).message,
          isListening: false,
        }));
      }
    }
  };

  // --- Render ---

  const getMicButtonLabel = () => {
    if (voiceState.isListening) {
      return 'Stop recording. Tap to stop.';
    }
    return 'Start recording. Tap to speak product name.';
  };

  const renderProductResult = () => {
    if (!voiceState.foundProduct) {
      return null;
    }

    if (voiceState.foundProduct === 'not_found') {
      return (
        <View style={styles.resultBox} accessible={true}>
          <Text style={styles.resultHeader}>Not Found</Text>
          <Text style={styles.resultText}>
            Heard: "{voiceState.finalTranscript}"
          </Text>
        </View>
      );
    }

    const product = voiceState.foundProduct as Product;
    return (
      <View style={styles.resultBox} accessible={true}>
        <Text style={styles.resultHeader}>{product.name}</Text>
        <Text style={styles.resultId}>ID: {product.id}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ProductVoiceCode</Text>

      <View style={styles.micContainer}>
        <TouchableOpacity
          style={[
            styles.micButton,
            voiceState.isListening && styles.micButtonListening,
          ]}
          onPress={toggleListening}
          accessibilityRole="button"
          accessibilityLabel={getMicButtonLabel()}
          testID="mic-button">
          {/* Simple text as icon placeholder */}
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>

        <Text style={styles.transcriptText}>
          {voiceState.isListening
            ? voiceState.partialTranscript || 'Listening...'
            : 'Tap mic to start'}
        </Text>
      </View>

      {renderProductResult()}

      {voiceState.error && (
        <Text style={styles.errorText}>Error: {voiceState.error}</Text>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute',
    top: 60,
  },
  micContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  micButtonListening: {
    backgroundColor: '#FF3B30', // Red when listening
  },
  micIcon: {
    fontSize: 60,
  },
  transcriptText: {
    fontSize: 16,
    color: '#333',
    marginTop: 20,
    height: 30, // Reserve space
    fontStyle: 'italic',
  },
  resultBox: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  resultHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  resultId: {
    fontSize: 20,
    color: '#007AFF',
    marginTop: 8,
  },
  resultText: {
    fontSize: 16,
    color: '#555',
    marginTop: 4,
  },
  errorText: {
    color: 'red',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default App;
