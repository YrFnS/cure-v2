import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('./NetworkStatusToast.tsx', import.meta.url),
  'utf8',
);
const reduceMotionSource = await readFile(
  new URL('../lib/use-reduced-motion.ts', import.meta.url),
  'utf8',
);

test('keeps the root network toast off Reanimated in release builds', () => {
  expect(source).toContain(
    "import { Animated, Easing, Text } from 'react-native';",
  );
  expect(source).not.toContain("from 'react-native-reanimated'");
  expect(source).toContain('useReducedMotionEnabled()');
  expect(reduceMotionSource).toContain('AccessibilityInfo.isReduceMotionEnabled()');
  expect(reduceMotionSource).toContain("addEventListener('reduceMotionChanged'");
  expect(source).toContain('progress.setValue(target)');
  expect(source).toContain('useNativeDriver: true');
  expect(source).toContain('easing: Easing.inOut(Easing.quad)');
  expect(source).toContain('duration: 220');
  expect(source).toContain('opacity: progress');
  expect(source).toContain('outputRange: [-12, 0]');
});
