import React from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
// @ts-expect-error deep import without declaration
import openURLInBrowser from 'react-native/Libraries/Core/Devtools/openURLInBrowser';

const ICONS = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  book: require('./assets/book-open.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  logo: require('./assets/building-skyscraper.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  debug: require('./assets/debug-check.png'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  zap: require('./assets/zap.png'),
} as const;

function Card({
  dark,
  icon,
  title,
  description,
}: {
  dark: boolean;
  description: string;
  icon: keyof typeof ICONS;
  title: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconContainer}>
        <Image
          source={ICONS[icon]}
          style={styles.featureIcon}
          resizeMode="contain"
        />
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: dark ? '#fff' : '#000' }]}>
          {title}
        </Text>
        <Text style={[styles.featureDescription]}>{description}</Text>
      </View>
    </View>
  );
}

function WelcomeScreen() {
  const isDarkMode = useColorScheme() === 'dark';
  const bgColor = isDarkMode ? '#000' : '#fff';
  const textColor = isDarkMode ? '#fff' : '#000';
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  const animatedStyle = { transform: [{ scale: scaleValue }] };

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  };

  const onPress = () => {
    openURLInBrowser('https://rnef.dev');
  };

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={ICONS['logo']}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.title, { color: textColor }]}>
          Welcome to React Native Enterprise Framework!
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.featureList}>
          <Card
            dark={isDarkMode}
            icon="zap"
            title="Start building"
            description="Open App.tsx, edit and see your changes live here"
          />
          <Card
            dark={isDarkMode}
            icon="debug"
            title="Debug with DevTools"
            description={`Press ${Platform.select({
              ios: 'Cmd+D',
              android: 'Ctrl+M',
            })} to access Dev Menu to debug, reload and inspect your app`}
          />
          <Card
            dark={isDarkMode}
            icon="book"
            title="Learn more"
            description="Visit our documentation and learn about Remote Cache, Brownfield, and more by Callstack"
          />
        </View>
        <View style={styles.footer}>
          <Animated.View style={[styles.buttonContainer, animatedStyle]}>
            <Pressable
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={onPress}
              style={styles.button}
            >
              <Text style={styles.buttonText}>View Documentation</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 2,
  },
  header: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  content: {
    flex: 1.2,
    justifyContent: 'flex-start',
    marginHorizontal: 16,
  },
  featureList: {
    flex: 1,
    flexShrink: 1,
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  buttonContainer: {
    marginBottom: 60,
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: 'rgb(120,55,245)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginRight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureIcon: {
    width: 30,
    height: 30,
  },
  featureContent: {
    flex: 1,
    flexShrink: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default WelcomeScreen;
