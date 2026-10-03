import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { colours } from '../theme';

// The peeling-orange animation, full screen. React Native's own <Image> only
// shows the first frame of an animated WebP; expo-image plays all of them.
export default function Splash() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/peeling.webp')}
        style={styles.animation}
        contentFit="contain"
        autoplay
        accessibilityLabel="Caltal is loading"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // absoluteFill lets the same splash cover the sign-in form while it works
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colours.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  animation: { width: 260, height: 260 },
});
