import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Text } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useSettingsStore } from '@/lib/settings-store';
import { useReducedMotionEnabled } from '@/lib/use-reduced-motion';

export default function NetworkStatusToast() {
  const insets = useSafeAreaInsets();
  const theme = useSettingsStore(s => s.theme);
  const netInfo = useNetInfo();
  const visible = netInfo.isConnected === false || netInfo.isInternetReachable === false;
  // Reanimated 3.19 crashes this root-mounted view in SDK 54 release builds.
  // Keep this startup animation on React Native's built-in driver.
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotionEnabled = useReducedMotionEnabled();

  useEffect(() => {
    if (reduceMotionEnabled === null) return;

    const target = visible ? 1 : 0;
    if (reduceMotionEnabled) {
      progress.setValue(target);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: target,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotionEnabled, visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: insets.top + 10,
          left: 14,
          right: 14,
          zIndex: 999,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme === 'dark' ? '#7F1D1D' : '#FECACA',
          backgroundColor: theme === 'dark' ? '#450A0A' : '#FEF2F2',
          paddingVertical: 10,
          paddingHorizontal: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        },
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <WifiOff size={16} color={theme === 'dark' ? '#FCA5A5' : '#DC2626'} />
      <Text
        style={{
          fontFamily: 'Cairo_600SemiBold',
          fontSize: 12,
          color: theme === 'dark' ? '#FECACA' : '#B91C1C',
        }}
      >
        لا يوجد اتصال بالانترنت. يتم عرض آخر البيانات المحفوظة.
      </Text>
    </Animated.View>
  );
}
