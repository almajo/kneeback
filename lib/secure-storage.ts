import * as SecureStore from "expo-secure-store";

const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}_chunk_${index}`;
}

function countKey(key: string): string {
  return `${key}_chunk_count`;
}

export class LargeSecureStore {
  async setItem(key: string, value: string): Promise<void> {
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);

    const storeChunks = Array.from({ length: chunkCount }, (_, i) => {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      return SecureStore.setItemAsync(chunkKey(key, i), chunk);
    });

    await Promise.all(storeChunks);
    await SecureStore.setItemAsync(countKey(key), String(chunkCount));
  }

  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(countKey(key));
    if (!countStr) return null;

    const chunkCount = parseInt(countStr, 10);
    if (isNaN(chunkCount) || chunkCount <= 0) return null;

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) =>
        SecureStore.getItemAsync(chunkKey(key, i))
      )
    );

    if (chunks.some((c) => c === null)) return null;

    return chunks.join("");
  }

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(countKey(key));
    if (!countStr) return;

    const chunkCount = parseInt(countStr, 10);
    if (!isNaN(chunkCount) && chunkCount > 0) {
      await Promise.all(
        Array.from({ length: chunkCount }, (_, i) =>
          SecureStore.deleteItemAsync(chunkKey(key, i))
        )
      );
    }

    await SecureStore.deleteItemAsync(countKey(key));
  }
}

export const largeSecureStore = new LargeSecureStore();
