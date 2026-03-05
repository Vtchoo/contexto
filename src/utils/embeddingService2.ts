import { SafetensorsRandomAccess } from "../utils/safetensorsRandomAccessReader";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import { Readable } from "stream";
import { IEmbeddingService } from "./embeddingServiceInterface";
import { portugueseStopWords } from "./data";

export enum WordEmbeddingModel {
  GLOVE_100D = "glove-100d",
  GLOVE_300D = "glove-300d",
  GLOVE_400D = "glove-400d",
  GLOVE_600D = "glove-600d",
}

const tempDir = os.tmpdir();

interface WordEmbeddingsServiceOptions {
  filterStopWords?: boolean;
}

export class WordEmbeddingsService implements IEmbeddingService {
  private filterStopWords: boolean;

  private vocabulary: string[] = [];
  private vocabIndex: Map<string, number> = new Map();

  private dimensions;

  private icfDictionary: Map<string, number> = new Map();
  private hasIcfFile = false;

  public isLoaded = false;

  // safetensors header index
  private stIndex: Awaited<
    ReturnType<typeof SafetensorsRandomAccess.openIndex>
  > | null = null;

  private cache = new Map<string, Float32Array>();
  private cacheMax = 10_000;

  private embeddingPath: string;
  private vocabPath: string;

  private filter = (word: string) => !portugueseStopWords.has(word);

  constructor(
    private model: WordEmbeddingModel,
    options?: WordEmbeddingsServiceOptions,
  ) {
    this.filterStopWords = options?.filterStopWords ?? false;
    this.dimensions = WordEmbeddingsService.getDimensionsFromModel(model);
    this.embeddingPath = WordEmbeddingsService.getFilePath(model);
    this.vocabPath = WordEmbeddingsService.getVocabPath(model);
  }

  private initializationPromise: Promise<void> | null = null;

  public async initialize(): Promise<void> {
    if (!this.initializationPromise) {
      this.initializationPromise = this.setup();
    }
    return this.initializationPromise;
  }

  async setup(): Promise<void> {
    if (this.isLoaded) return;

    await this.ensureEmbeddingFileExists(
      this.model,
      `https://huggingface.co/nilc-nlp/${this.model}/resolve/main/embeddings.safetensors?download=true`,
      this.embeddingPath,
    );

    await ensureFileExists(
      `https://huggingface.co/nilc-nlp/${this.model}/resolve/main/vocab.txt?download=true`,
      this.vocabPath,
    );

    await this.loadVocabulary();
    this.stIndex = await SafetensorsRandomAccess.openIndex(this.embeddingPath);

    // Optional: validate tensor exists & dims match
    const embInfo = this.stIndex.tensors.get("embeddings");

    if (!embInfo)
      throw new Error(`Tensor "embeddings" not found in ${this.embeddingPath}`);
    if (embInfo.dtype !== "F32")
      throw new Error(`Expected embeddings dtype F32, got ${embInfo.dtype}`);
    // embInfo.shape likely [vocabSize, dims]
    if (embInfo.shape?.length === 2 && embInfo.shape[1] !== this.dimensions) {
      throw new Error(
        `Embedding dims mismatch: tensor has ${embInfo.shape[1]} but expected ${this.dimensions}`,
      );
    }

    await this.loadIcfDictionary();

    this.isLoaded = true;
  }

  private async loadVocabulary(): Promise<void> {
    const content = await fs.promises.readFile(this.vocabPath, "utf-8");
    this.vocabulary = content
      .trim()
      .split("\n")
      .map((w) => w.toLowerCase());

    this.vocabIndex.clear();
    for (let i = 0; i < this.vocabulary.length; i++) {
      this.vocabIndex.set(this.vocabulary[i], i);
    }
  }

  private async loadIcfDictionary(): Promise<void> {
    try {
      const icfPath = path.join(path.dirname(this.embeddingPath), "icf.txt");
      try {
        await fs.promises.access(icfPath);
        this.hasIcfFile = true;
      } catch {
        this.hasIcfFile = false;
        return;
      }

      const content = await fs.promises.readFile(icfPath, "utf-8");
      const lines = content.trim().split("\n");

      this.icfDictionary.clear();
      for (const line of lines) {
        const [word, icfValue] = line.split(",");
        if (word && icfValue)
          this.icfDictionary.set(word.toLowerCase(), parseFloat(icfValue));
      }
    } catch (e) {
      console.error(`Failed to load ICF dictionary: ${e}`);
      this.hasIcfFile = false;
    }
  }

  private cachePut(key: string, val: Float32Array) {
    this.cache.set(key, val);
    if (this.cache.size > this.cacheMax) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
  }

  private async getEmbedding(word: string): Promise<Float32Array | null> {
    if (!this.isLoaded || !this.stIndex) {
      throw new Error(
        "Embeddings service not initialized. Call initialize() first.",
      );
    }

    const w = word.toLowerCase();
    const cached = this.cache.get(w);
    if (cached) return cached;

    const idx = this.vocabIndex.get(w);
    if (idx === undefined) return null;

    const vec = await SafetensorsRandomAccess.readTensorRowF32(
      this.embeddingPath,
      this.stIndex,
      "embeddings",
      idx,
      this.dimensions,
    );

    const out = new Float32Array(vec);
    this.cachePut(w, out);
    return out;
  }

  hasWord(word: string): boolean {
    return this.vocabIndex.has(word.toLowerCase());
  }

  getVocabularySize(): number {
    return this.vocabulary.length;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new Error(
        "Vectors must be of the same length for cosine similarity",
      );
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const norm = Math.sqrt(normA) * Math.sqrt(normB);
    return norm === 0 ? 0 : dotProduct / norm;
  }

  sum(a: Float32Array, b: Float32Array): Float32Array {
    const r = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) r[i] = a[i] + b[i];
    return r;
  }

  multiply(v: Float32Array, s: number): Float32Array {
    const r = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) r[i] = v[i] * s;
    return r;
  }

  async getTextEmbedding(text: string): Promise<Float32Array | null> {
    if (!this.isLoaded)
      throw new Error(
        "Embeddings service not initialized. Call initialize() first.",
      );

    const words = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .split(/\s+/);

    let summed = new Float32Array(this.dimensions);
    let found = 0;

    for (const word of words) {
      if (this.filterStopWords && !this.filter(word)) continue;

      const emb = await this.getEmbedding(word);
      if (!emb) continue;

      const used =
        this.hasIcfFile && this.icfDictionary.has(word)
          ? this.multiply(emb, this.icfDictionary.get(word)!)
          : emb;

      summed = this.sum(summed, used);
      found++;
    }

    return found === 0 ? null : summed;
  }

  static getFilePath(model: WordEmbeddingModel): string {
    return path.join(tempDir, `embeddings`, `${model}.safetensors`);
  }
  static getVocabPath(model: WordEmbeddingModel): string {
    return path.join(tempDir, `embeddings`, `${model}.vocab.txt`);
  }

  static getDimensionsFromModel(model: WordEmbeddingModel): number {
    const parts = model.split("-");
    const dimPart = parts[parts.length - 1];
    const dims = parseInt(dimPart.replace("d", ""), 10);
    return dims;
  }

  static getPointerFilePath(model: WordEmbeddingModel): string {
    return `https://huggingface.co/nilc-nlp/${model}/raw/main/embeddings.safetensors`;
  }

  async ensureEmbeddingFileExists(
    model: WordEmbeddingModel,
    url: string,
    outputPath: string,
  ) {
    const fileExists = fs.existsSync(outputPath);
    if (fileExists) {
      // checksum verification
      const pointerFileUrl = WordEmbeddingsService.getPointerFilePath(model);
      const { data } = await axios.get(pointerFileUrl);
      const lines = data.split("\n");
      const oidLine = lines.find((line: string) =>
        line.startsWith("oid sha256:"),
      );
      if (oidLine) {
        const remoteChecksum = oidLine.split(" ")[1].split(":")[1];
        // Compute the local file checksum and compare
        const localFileBuffer = fs.createReadStream(outputPath);
        const crypto = await import("crypto");
        const hash = crypto.createHash("sha256");
        const stream = localFileBuffer.pipe(hash);
        const localChecksum = await new Promise<string>((resolve, reject) => {
          stream.on("finish", () => {
            resolve(hash.digest("hex"));
          });
          stream.on("error", reject);
        });
        if (localChecksum === remoteChecksum) {
          return;
        } else {
          console.warn(
            "Embedding file checksum mismatch, re-downloading the file.",
          );
          fs.unlinkSync(outputPath);
        }
      }
    }
    await ensureFileExists(url, outputPath);
    return;
  }
}

async function ensureFileExists(url: string, outputPath: string) {
  const folderPath = path.dirname(outputPath);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  if (!fs.existsSync(outputPath)) {
    await downloadFile(url, outputPath);
  }
}

async function downloadFile(url: string, outputPath: string) {
  const response = await axios<Readable>({
    method: "GET",
    url,
    responseType: "stream",
    headers: { "User-Agent": "node" },
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}
