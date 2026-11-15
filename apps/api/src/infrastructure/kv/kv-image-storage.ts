import type { ImageStorage } from "../../application";

export interface ImageMetadata {
  contentType: string;
}

/**
 * Fotos dos produtos no Workers KV (ADR-0006).
 * Cada upload gera uma chave nova, então a consistência eventual do KV (~60s) não afeta o cardápio.
 */
export class KvImageStorage implements ImageStorage {
  constructor(private readonly namespace: KVNamespace) {}

  async put(key: string, data: ArrayBuffer, contentType: string): Promise<void> {
    await this.namespace.put(key, data, { metadata: { contentType } satisfies ImageMetadata });
  }

  async delete(key: string): Promise<void> {
    await this.namespace.delete(key);
  }
}
