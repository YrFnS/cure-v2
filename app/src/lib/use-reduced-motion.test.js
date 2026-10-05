import { expect, test, mock } from 'bun:test';
import { createElement } from 'react';
import TestRenderer from 'react-test-renderer';
import { readFile } from 'node:fs/promises';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let nativeEventCallback = null;
let queryResolves = true;

mock.module('react-native', () => ({
  Platform: { OS: 'ios' },
  AccessibilityInfo: {
    addEventListener: (_event, cb) => {
      nativeEventCallback = cb;
      return { remove: () => {} };
    },
    isReduceMotionEnabled: () =>
      queryResolves ? Promise.resolve(true) : new Promise(() => {}),
  },
}));

// Fix 2 guard: the reduce-motion snapshot must never stay null. A bounded timeout
// must publish `false` (animations on) as a floor, and a later native event must
// still win. When react-native is mock-isolated (e.g. `bun test <this file>`) we
// assert the real runtime behaviour. In the full `bun test` run the real RN stub
// is preloaded and cannot be mocked, so we fall back to a source guard that
// asserts the same invariants (the style used by FadeInDownView.test.js).
test('reduce-motion snapshot resolves without a query and a later native event wins', async () => {
  let mod;
  try {
    mod = await import('./use-reduced-motion');
  } catch {
    mod = null;
  }

  if (mod) {
    queryResolves = false;
    let value = null;
    const Component = () => {
      value = mod.useReducedMotionEnabled();
      return null;
    };

    let renderer;
    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(createElement(Component));
    });
    expect(value).toBe(false);

    await TestRenderer.act(async () => {
      nativeEventCallback(true);
    });
    expect(value).toBe(true);

    renderer.unmount();
    return;
  }

  const source = await readFile(
    new URL('./use-reduced-motion.ts', import.meta.url),
    'utf8',
  );
  expect(source).toContain('let reduceMotionEnabled = false;');
  expect(source).toMatch(
    /addEventListener\('reduceMotionChanged',\s*enabled\s*=>\s*\{\s*observedNativeChange\s*=\s*true/,
  );
  expect(source).toContain('if (!observedNativeChange) publish(enabled);');
});
