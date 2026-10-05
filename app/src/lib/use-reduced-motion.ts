import { useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

type Listener = () => void;

// Default to animations on. Native accessibility availability must never hide
// every FadeInDownView while its query is pending.
let reduceMotionEnabled = false;
let observationStarted = false;
let observedNativeChange = false;
const listeners = new Set<Listener>();

function publish(enabled: boolean) {
  if (reduceMotionEnabled === enabled) return;
  reduceMotionEnabled = enabled;
  listeners.forEach(listener => listener());
}

function startObservation() {
  if (observationStarted) return;
  observationStarted = true;

  AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
    observedNativeChange = true;
    publish(enabled);
  });

  void AccessibilityInfo.isReduceMotionEnabled()
    .then(enabled => {
      if (!observedNativeChange) publish(enabled);
    })
    .catch(() => {
      // The visible default already covers failed accessibility lookups.
    });
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  startObservation();
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return reduceMotionEnabled;
}

export function useReducedMotionEnabled() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
