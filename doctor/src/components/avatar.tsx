import { useState } from "react";
import { Image, View } from "react-native";
import { UserRound } from "lucide-react-native";
import { photoUrl } from "@/lib/api";

export function Avatar({
  url,
  name,
  large = false,
}: {
  url: string | null;
  name: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const uri = photoUrl(url);
  const size = large ? 126 : 52;
  return (
    <View
      className="items-center justify-center rounded-full border-4 border-white bg-soft"
      style={{ width: size, height: size, overflow: "hidden" }}
    >
      {uri && failed !== uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel={name}
          style={{ width: size, height: size }}
          onError={() => setFailed(uri)}
        />
      ) : (
        <UserRound size={large ? 64 : 28} color="#5c85d9" />
      )}
    </View>
  );
}
