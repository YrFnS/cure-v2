import React from 'react';
import Pdf from 'react-native-pdf';

type Props = { uri: string; token: string; onError: () => void };

// The lab's original PDF, rendered natively so all of its formatting survives.
export function PdfViewer({ uri, token, onError }: Props) {
  return (
    <Pdf
      // Private medical file: fetched with the patient's session, not cached on disk.
      source={{ uri, headers: { Authorization: `Bearer ${token}` }, cache: false }}
      trustAllCerts={false}
      onError={onError}
      style={{ flex: 1, backgroundColor: 'transparent' }}
    />
  );
}
