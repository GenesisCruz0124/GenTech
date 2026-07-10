import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const exitAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance: logo fades + slides up, then text, then dots
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      ]),
      Animated.timing(textAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(dotAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Exit after 4.5s (leaves 0.5s for fade-out to reach 5s total)
    const exit = setTimeout(() => {
      Animated.timing(exitAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
        onDone();
      });
    }, 4500);

    return () => clearTimeout(exit);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: exitAnim }]}>
      <View style={styles.center}>
        <Animated.View style={{
          opacity: logoAnim,
          transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        }}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        </Animated.View>

        <Animated.Text style={[styles.appName, { opacity: textAnim, transform: [{ translateY: textAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
          GenTech
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: textAnim }]}>
          Repair Shop Manager
        </Animated.Text>
      </View>

      <Animated.View style={[styles.dots, { opacity: dotAnim }]}>
        <Dot delay={0} />
        <Dot delay={200} />
        <Dot delay={400} />
      </Animated.View>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        Animated.delay(600 - delay),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[styles.dot, { opacity: anim }]} />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1565C0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    zIndex: 9999,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
    marginBottom: 24,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
