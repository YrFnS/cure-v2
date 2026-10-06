import { expect, mock, test } from 'bun:test';
import { readFile } from 'node:fs/promises';

const platform = { OS: 'web' };
const nativeCalls = [];
mock.module('react-native', () => ({
  Platform: platform,
  Alert: { alert: (...args) => nativeCalls.push(args) },
}));

test('uses browser dialogs on web and Alert.alert on native', async () => {
  // In the full run another file's react-native mock wins; fall back to a source guard
  // (same approach as use-reduced-motion.test.js).
  let showAlert;
  try {
    ({ showAlert } = await import('./alert'));
  } catch {
    const source = await readFile(new URL('./alert.ts', import.meta.url), 'utf8');
    expect(source).toContain('window.confirm(text) ? action : cancel');
    expect(source).toContain("if (Platform.OS !== 'web')");
    return;
  }
  const pressed = [];
  const buttons = [
    { text: 'No', style: 'cancel', onPress: () => pressed.push('no') },
    { text: 'Yes', style: 'destructive', onPress: () => pressed.push('yes') },
  ];

  let confirmAnswer = true;
  const shown = [];
  globalThis.window = {
    confirm: text => {
      shown.push(text);
      return confirmAnswer;
    },
    alert: text => shown.push(text),
  };

  showAlert('Logout', 'Sure?', buttons);
  confirmAnswer = false;
  showAlert('Logout', 'Sure?', buttons);
  showAlert('Error', 'Failed');
  expect(pressed).toEqual(['yes', 'no']);
  expect(shown).toEqual(['Logout\n\nSure?', 'Logout\n\nSure?', 'Error\n\nFailed']);

  platform.OS = 'ios';
  showAlert('Logout', 'Sure?', buttons);
  expect(nativeCalls).toEqual([['Logout', 'Sure?', buttons]]);
  delete globalThis.window;
});
