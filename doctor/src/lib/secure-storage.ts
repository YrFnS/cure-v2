import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Only the short session token is persisted; profiles and query results stay in memory.
export const secureStorage = {
  getItem: (name: string): Promise<string | null> =>
    Platform.OS === "web"
      ? AsyncStorage.getItem(name)
      : SecureStore.getItemAsync(name),
  setItem: (name: string, value: string): Promise<void> =>
    Platform.OS === "web"
      ? AsyncStorage.setItem(name, value)
      : SecureStore.setItemAsync(name, value),
  removeItem: (name: string): Promise<void> =>
    Platform.OS === "web"
      ? AsyncStorage.removeItem(name)
      : SecureStore.deleteItemAsync(name),
};
// shortcut: web tokens use localStorage like the patient demo; use httpOnly cookies before a public web launch.
