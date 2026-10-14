/// <reference lib="dom" />
import React from 'react';
import { ActivityIndicator } from 'react-native';

type Props = { uri: string; token: string; onError: () => void };

// Browsers render PDFs natively; the file needs the session header, so load it as a blob first.
export function PdfViewer({ uri, token, onError }: Props) {
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    let url = '';
    fetch(uri, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then(blob => setSrc((url = URL.createObjectURL(blob))))
      .catch(onError);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [uri, token, onError]);

  if (!src) return <ActivityIndicator size="large" color="#0891B2" style={{ flex: 1 }} />;
  return <iframe src={src} title="PDF" style={{ flex: 1, width: '100%', height: '100%', border: 0 }} />;
}
