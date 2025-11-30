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
  I18nManager,
  Image,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';
import {findProduct} from './src/hooks/useProductMatcher';
import {Product, VoiceState} from './src/types';

// Force RTL layout for Hebrew support
I18nManager.forceRTL(true);

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
    // Translate common error messages to Hebrew
    let errorMessage = 'שגיאה לא ידועה'; // Unknown error
    if (e.error?.message) {
      if (
        e.error.message.includes('7') ||
        e.error.message.includes('No match')
      ) {
        errorMessage = 'לא שמעתי, נסה שוב'; // Didn't hear, try again
      } else {
        errorMessage = e.error.message;
      }
    }

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

    // Announce result for accessibility (Hebrew)
    const resultText = product
      ? `נמצא: ${product.name}, מזהה: ${product.id}`
      : 'מוצר לא נמצא';
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
  }, []);

  // --- Actions ---

  const requestAudioPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'אישור מיקרופון',
            message: 'האפליקציה צריכה גישה למיקרופון כדי לחפש מוצרים בקול.',
            buttonNeutral: 'שאל אותי אחר כך',
            buttonNegative: 'ביטול',
            buttonPositive: 'אישור',
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
          error: 'אין הרשאה לשימוש במיקרופון',
        }));
        return;
      }

      // Reset state before starting
      setVoiceState({
        ...initialState,
        isListening: true,
      });

      try {
        // Set locale to Hebrew (Israel)
        await Voice.start('he-IL');
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
      return 'עצור הקלטה. לחץ לעצירה.';
    }
    return 'התחל הקלטה. לחץ ואמור שם מוצר.';
  };

  const renderProductResult = () => {
    if (!voiceState.foundProduct) {
      return null;
    }

    if (voiceState.foundProduct === 'not_found') {
      return (
        <View style={styles.resultBox} accessible={true}>
          <Text style={styles.resultHeader}>לא נמצא</Text>
          <Text style={styles.resultText}>
            שמעתי: "{voiceState.finalTranscript}"
          </Text>
        </View>
      );
    }

    const product = voiceState.foundProduct as Product;
    return (
      <View style={styles.resultBox} accessible={true}>
        <Text style={styles.resultHeader}>{product.name}</Text>
        <Text style={styles.resultId}>קוד: {product.id}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.micContainer}>
        {/* 1. LOGO AT TOP */}
        <Image
          source={require('./src/assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        {/* 2. TEXT IN MIDDLE */}
        <Text style={styles.transcriptText}>
          {voiceState.isListening
            ? voiceState.partialTranscript || 'מקשיב...'
            : 'לחץ על המיקרופון'}
        </Text>

        {/* 3. MIC BUTTON AT BOTTOM */}
        <TouchableOpacity
          style={[
            styles.micButton,
            voiceState.isListening && styles.micButtonListening,
          ]}
          onPress={toggleListening}
          accessibilityRole="button"
          accessibilityLabel={getMicButtonLabel()}
          testID="mic-button">
          <Text style={styles.micIcon}>🎤</Text>
        </TouchableOpacity>
      </View>

      {renderProductResult()}

      {voiceState.error && (
        <Text style={styles.errorText}>{voiceState.error}</Text>
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
    paddingTop: 50,
  },
  micContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  // Logo Styles
  logoImage: {
    width: '80%',
    height: 100,
    marginBottom: 20, // Push text down
  },
  // Text Styles
  transcriptText: {
    fontSize: 24,
    color: '#333',
    height: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30, // Push Mic down
  },
  // Mic Button Styles
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
    // Removed marginBottom since it's now at the bottom
  },
  micButtonListening: {
    backgroundColor: '#FF3B30', // Red when listening
  },
  micIcon: {
    fontSize: 60,
    color: '#FFFFFF',
  },
  resultBox: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
    textAlign: 'center',
  },
  resultId: {
    fontSize: 22,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '600',
  },
  resultText: {
    fontSize: 18,
    color: '#555',
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
});

export default App;
