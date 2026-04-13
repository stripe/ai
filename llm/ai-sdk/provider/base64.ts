const BINARY_STRING_CHUNK_SIZE = 0x8000;

export function uint8ArrayToBase64(data: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString(
      'base64'
    );
  }

  const binaryChunks: string[] = [];

  for (let index = 0; index < data.length; index += BINARY_STRING_CHUNK_SIZE) {
    const chunk = data.subarray(index, index + BINARY_STRING_CHUNK_SIZE);
    binaryChunks.push(String.fromCharCode(...chunk));
  }

  return btoa(binaryChunks.join(''));
}
