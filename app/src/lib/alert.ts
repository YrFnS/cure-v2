/// <reference lib="dom" />
import { Alert, Platform, type AlertButton } from 'react-native';

// Alert.alert is a no-op on react-native-web; use the browser dialogs there.
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const cancel = buttons?.find(b => b.style === 'cancel');
  const action = buttons?.find(b => b !== cancel);
  if (cancel && action) {
    (window.confirm(text) ? action : cancel).onPress?.();
    return;
  }
  window.alert(text);
  buttons?.[0]?.onPress?.();
}
