/**
 * @format
 */

import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Ignore the specific warning globally, right at startup
LogBox.ignoreLogs([
  'new NativeEventEmitter',
  '`new NativeEventEmitter()`', // Adding variations just to be safe
]);

AppRegistry.registerComponent(appName, () => App);
