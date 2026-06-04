import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

function AnimatedTitle({ title }: { title: string }) {
  const slideAnim = useRef(new Animated.Value(-24)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 90,
        friction: 8,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={{
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        transform: [{ translateX: slideAnim }],
        opacity: fadeAnim,
      }}
    >
      {title}
    </Animated.Text>
  );
}

export function useAnimatedTabTitle(navigation: any, title: string) {
  const keyRef = useRef(0);

  const setTitle = useCallback(() => {
    keyRef.current += 1;
    const k = keyRef.current;
    navigation.setOptions({
      headerTitle: () => <AnimatedTitle key={k} title={title} />,
    });
  }, [navigation, title]);

  useLayoutEffect(() => { setTitle(); }, []);
  useFocusEffect(useCallback(() => { setTitle(); }, [setTitle]));
}
