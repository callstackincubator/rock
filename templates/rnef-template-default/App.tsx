import HomeIOS from '@rnef/platform-ios/welcome';
import HomeAndroid from '@rnef/platform-android/welcome';
import {Platform} from 'react-native';

export function App() {
  const Home = Platform.select({
    ios: HomeIOS,
    android: HomeAndroid,
  });
  return <Home />;
}

export default App;
