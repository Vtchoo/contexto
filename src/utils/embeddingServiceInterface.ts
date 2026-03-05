export interface GetTextEmbeddingOptions {
  cache?: boolean;
}

export interface IEmbeddingService {
  isLoaded: boolean;
  initialize(): Promise<void>;
  getTextEmbedding(
    str: string,
    options?: GetTextEmbeddingOptions
  ): Promise<Float32Array | null>;
  cosineSimilarity(a: Float32Array, b: Float32Array): number;
}
