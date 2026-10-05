declare module '@expo-google-fonts/cairo' {
  export function useFonts(fontMap: {
    Cairo_400Regular?: number;
    Cairo_500Medium?: number;
    Cairo_600SemiBold?: number;
    Cairo_700Bold?: number;
    [key: string]: number | undefined;
  }): [boolean, Error | null];

  export const Cairo_400Regular: number;
  export const Cairo_500Medium: number;
  export const Cairo_600SemiBold: number;
  export const Cairo_700Bold: number;
}
