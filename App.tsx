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
  LogBox,
  ScrollView,
} from 'react-native';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
} from '@react-native-voice/voice';
import {findProduct} from './src/hooks/useProductMatcher';
import {VoiceState} from './src/types'; // <--- Fixed: Removed unused 'Product'

// --- IGNORE WARNINGS ---
LogBox.ignoreLogs(['new NativeEventEmitter']);
// -----------------------

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
    console.log('onSpeechError:', e);

    let errorMessage = 'שגיאה לא ידועה';
    if (e.error?.message) {
      if (
        e.error.message.includes('7') ||
        e.error.message.includes('No match')
      ) {
        errorMessage = 'לא שמעתי, נסה שוב';
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

    // findProduct now returns an Array or null
    const products = findProduct(transcript);

    setVoiceState(prev => ({
      ...prev,
      finalTranscript: transcript,
      foundProduct: products || 'not_found',
      partialTranscript: '',
      isListening: false,
    }));

    // Accessibility Announcement
    if (products && products.length > 0) {
      if (products.length === 1) {
        AccessibilityInfo.announceForAccessibility(`נמצא: ${products[0].name}`);
      } else {
        AccessibilityInfo.announceForAccessibility(
          `נמצאו ${products.length} מוצרים`,
        );
      }
    } else {
      AccessibilityInfo.announceForAccessibility('מוצר לא נמצא');
    }
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
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;

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
    return true;
  };

  const toggleListening = async () => {
    try {
      if (voiceState.isListening) {
        await Voice.stop();
        setVoiceState(prev => ({...prev, isListening: false}));
      } else {
        const hasPermission = await requestAudioPermission();
        if (!hasPermission) {
          setVoiceState(prev => ({
            ...prev,
            error: 'אין הרשאה לשימוש במיקרופון',
          }));
          return;
        }

        await Voice.destroy();
        setVoiceState({
          ...initialState,
          isListening: true,
        });
        await Voice.start('he-IL');
      }
    } catch (e) {
      console.log('Toggle Error:', e);
      setVoiceState(prev => ({
        ...prev,
        error: (e as Error).message,
        isListening: false,
      }));
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

    // Handle Array of Products
    const products = Array.isArray(voiceState.foundProduct)
      ? voiceState.foundProduct
      : [voiceState.foundProduct];

    return (
      <View style={styles.resultsContainer}>
        <Text style={styles.resultCountText}>
          {products.length > 1
            ? `נמצאו ${products.length} תוצאות:`
            : 'נמצא מוצר אחד:'}
        </Text>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {products.map(product => (
            <View key={product.id} style={styles.resultItem}>
              <Text style={styles.resultHeader}>{product.name}</Text>
              <Text style={styles.resultId}>קוד: {product.id}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.micContainer}>
        {/* LOGO */}
        <Image
          source={require('./src/assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        {/* TEXT */}
        <Text style={styles.transcriptText}>
          {voiceState.isListening
            ? voiceState.partialTranscript || 'מקשיב...'
            : 'לחץ על המיקרופון'}
        </Text>

        {/* MIC BUTTON */}
        <TouchableOpacity
          style={[
            styles.micButton,
            voiceState.isListening && styles.micButtonListening,
          ]}
          onPress={toggleListening}
          accessibilityRole="button"
          accessibilityLabel={getMicButtonLabel()}
          testID="mic-button">
          <Text style={styles.micIcon}>🎙️</Text>
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
    justifyContent: 'center', // Centers vertical content
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 20,
    paddingTop: 50,
  },
  micContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    flexGrow: 0, // Prevent mic from taking up all space
  },
  logoImage: {
    width: '80%',
    height: 100,
    marginBottom: 20,
  },
  transcriptText: {
    fontSize: 24,
    color: '#333',
    height: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
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
    backgroundColor: '#FF3B30',
  },
  micIcon: {
    fontSize: 60,
    color: '#FFFFFF',
  },
  // --- UPDATED RESULT STYLES ---
  resultsContainer: {
    width: '100%',
    flex: 1, // Take remaining space
    alignItems: 'center',
  },
  resultCountText: {
    fontSize: 18,
    marginBottom: 10,
    color: '#555',
    fontWeight: 'bold',
  },
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  resultBox: {
    // Legacy style for "Not Found"
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
  resultItem: {
    // New style for list items
    width: '90%',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    marginBottom: 10, // Space between items
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 5,
    textAlign: 'center',
  },
  resultId: {
    fontSize: 20,
    color: '#007AFF',
    marginTop: 4,
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
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
});

export default App;
