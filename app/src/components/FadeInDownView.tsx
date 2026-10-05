import React, { useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Animated, Easing } from "react-native";
import { cssInterop } from "nativewind";
import { useReducedMotionEnabled } from "@/lib/use-reduced-motion";

const StyledAnimatedView = cssInterop(Animated.View, { className: "style" });

type FadeInDownViewProps = ComponentProps<typeof StyledAnimatedView> & {
  delay?: number;
  duration?: number;
};

export function FadeInDownView({
  delay = 0,
  duration = 300,
  style,
  ...props
}: FadeInDownViewProps) {
  // Reanimated 3.19 Animated.View crashes under SDK 54's legacy architecture.
  // React Native Animated preserves this entrance effect without that host path.
  // Never mount hidden: a stalled native animation must not blank a screen.
  const progress = useRef(new Animated.Value(1)).current;
  const entranceConfig = useRef({ delay, duration });
  const hasEntered = useRef(false);
  const reduceMotionEnabled = useReducedMotionEnabled();

  useEffect(() => {
    if (reduceMotionEnabled === null) return;

    // Reanimated entering transitions are mount-only. Never hide and replay a
    // mounted view when Reduce Motion or index-derived timing later changes.
    if (hasEntered.current) {
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }
    hasEntered.current = true;

    if (reduceMotionEnabled) {
      progress.setValue(1);
      return;
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      delay: entranceConfig.current.delay,
      duration: entranceConfig.current.duration,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotionEnabled]);

  return (
    <StyledAnimatedView
      {...props}
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [25, 0],
              }),
            },
          ],
        },
      ]}
    />
  );
}
