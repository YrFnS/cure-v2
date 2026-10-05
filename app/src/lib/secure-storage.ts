import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 512;
const CHUNK_MARKER = '@chunks';
let version = 0;

function parseMarker(value: string | null): { version: string; count: number } | null {
  if (!value?.startsWith(`${CHUNK_MARKER}:`)) return null;
  const [, markerVersion, count] = value.split(':');
  const parsedCount = Number(count);
  return markerVersion && Number.isInteger(parsedCount) && parsedCount > 0 && parsedCount <= 10000
    ? { version: markerVersion, count: parsedCount }
    : null;
}

function chunkKey(name: string, markerVersion: string, index: number): string {
  return `${name}.${markerVersion}.${index}`;
}

async function deleteChunks(name: string, marker: ReturnType<typeof parseMarker>): Promise<void> {
  if (!marker) return;
  await Promise.all(
    Array.from({ length: marker.count }, (_, index) =>
      SecureStore.deleteItemAsync(chunkKey(name, marker.version, index)),
    ),
  );
}

async function readNativeItem(name: string): Promise<string | null> {
  const stored = await SecureStore.getItemAsync(name);
  const marker = parseMarker(stored);
  if (!marker) return stored;

  const chunks = await Promise.all(
    Array.from({ length: marker.count }, (_, index) =>
      SecureStore.getItemAsync(chunkKey(name, marker.version, index)),
    ),
  );
  return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join('') : null;
}

async function writeNativeItem(name: string, value: string): Promise<void> {
  const previousMarker = parseMarker(await SecureStore.getItemAsync(name));
  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(name, value);
    await deleteChunks(name, previousMarker);
    return;
  }

  const markerVersion = `${Date.now().toString(36)}${(version += 1).toString(36)}`;
  const chunks = Array.from(
    { length: Math.ceil(value.length / CHUNK_SIZE) },
    (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
  );
  try {
    await Promise.all(
      chunks.map((chunk, index) =>
        SecureStore.setItemAsync(chunkKey(name, markerVersion, index), chunk),
      ),
    );
    await SecureStore.setItemAsync(name, `${CHUNK_MARKER}:${markerVersion}:${chunks.length}`);
  } catch (error) {
    await Promise.allSettled(
      chunks.map((_, index) =>
        SecureStore.deleteItemAsync(chunkKey(name, markerVersion, index)),
      ),
    );
    throw error;
  }
  await deleteChunks(name, previousMarker);
}

export const secureStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(name);

    try {
      const stored = await readNativeItem(name);
      if (stored !== null) return stored;
    } catch (error) {
      void error;
    }

    const legacy = await AsyncStorage.getItem(name);
    if (legacy === null) return null;
    try {
      await writeNativeItem(name, legacy);
      await AsyncStorage.removeItem(name);
    } catch (error) {
      void error;
    }
    return legacy;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') return AsyncStorage.setItem(name, value);
    await writeNativeItem(name, value);
    await AsyncStorage.removeItem(name);
  },
  removeItem: async (name: string): Promise<void> => {
    if (Platform.OS === 'web') return AsyncStorage.removeItem(name);
    const marker = parseMarker(await SecureStore.getItemAsync(name).catch(() => null));
    await Promise.all([
      SecureStore.deleteItemAsync(name),
      deleteChunks(name, marker),
      AsyncStorage.removeItem(name),
    ]);
  },
};
