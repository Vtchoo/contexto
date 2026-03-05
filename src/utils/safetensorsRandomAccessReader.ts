import fs from "fs";

type TensorInfo = {
  dtype: "F32" | "I32" | "U8";
  shape: number[];
  data_offsets: [number, number]; // relative to data section start
};

type SafetensorsIndex = {
  metadata: any;
  tensors: Map<string, TensorInfo>;
  headerLength: number;
  dataStartOffset: number; // 8 + headerLength
};

function bytesPerElement(dtype: TensorInfo["dtype"]): number {
  switch (dtype) {
    case "F32":
      return 4;
    case "I32":
      return 4;
    case "U8":
      return 1;
    default:
      throw new Error(`Unsupported dtype: ${dtype}`);
  }
}

async function readExactly(
  fd: fs.promises.FileHandle,
  position: number,
  length: number,
): Promise<Buffer> {
  const buf = Buffer.allocUnsafe(length);
  let offset = 0;
  while (offset < length) {
    const { bytesRead } = await fd.read(
      buf,
      offset,
      length - offset,
      position + offset,
    );
    if (bytesRead === 0) throw new Error("Unexpected EOF");
    offset += bytesRead;
  }
  return buf;
}

export class SafetensorsRandomAccess {
  static async openIndex(filePath: string): Promise<SafetensorsIndex> {
    const fd = await fs.promises.open(filePath, "r");
    try {
      // 1) header length (uint64 little-endian)
      const lenBuf = await readExactly(fd, 0, 8);
      const headerLengthBig = lenBuf.readBigUInt64LE(0);

      // IMPORTANT: safetensors header length must fit in JS number for our parsing.
      if (headerLengthBig > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error(
          `Header too large to parse safely: ${headerLengthBig.toString()}`,
        );
      }
      const headerLength = Number(headerLengthBig);

      // 2) header JSON
      const headerBuf = await readExactly(fd, 8, headerLength);
      const header = JSON.parse(headerBuf.toString("utf-8"));

      const { __metadata__, ...tensorInfo } = header;
      const metadata = __metadata__ || {};
      const tensors = new Map<string, TensorInfo>();

      for (const [name, info] of Object.entries(tensorInfo as any)) {
        tensors.set(name, {
          dtype: info.dtype,
          shape: info.shape,
          data_offsets: info.data_offsets,
        });
      }

      return {
        metadata,
        tensors,
        headerLength,
        dataStartOffset: 8 + headerLength,
      };
    } finally {
      await fd.close();
    }
  }

  /** Read a whole tensor into memory (still bounded to that tensor only). */
  static async readTensor(
    filePath: string,
    index: SafetensorsIndex,
    name: string,
  ): Promise<Float32Array | Int32Array | Uint8Array> {
    const info = index.tensors.get(name);
    if (!info) throw new Error(`Tensor not found: ${name}`);

    const [start, end] = info.data_offsets;
    const absStart = index.dataStartOffset + start;
    const byteLength = end - start;

    const fd = await fs.promises.open(filePath, "r");
    try {
      const buf = await readExactly(fd, absStart, byteLength);

      switch (info.dtype) {
        case "F32":
          return new Float32Array(
            buf.buffer,
            buf.byteOffset,
            buf.byteLength / 4,
          );
        case "I32":
          return new Int32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
        case "U8":
          return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      }
    } finally {
      await fd.close();
    }
  }

  /** Read a slice of a tensor (in BYTES relative to tensor start). */
  static async readTensorBytes(
    filePath: string,
    index: SafetensorsIndex,
    name: string,
    byteOffset: number,
    byteLength: number,
  ): Promise<Buffer> {
    const info = index.tensors.get(name);
    if (!info) throw new Error(`Tensor not found: ${name}`);

    const [start, end] = info.data_offsets;
    const tensorBytes = end - start;
    if (byteOffset < 0 || byteOffset + byteLength > tensorBytes) {
      throw new Error(`Slice out of range for tensor ${name}`);
    }

    const absStart = index.dataStartOffset + start + byteOffset;

    const fd = await fs.promises.open(filePath, "r");
    try {
      return await readExactly(fd, absStart, byteLength);
    } finally {
      await fd.close();
    }
  }

  /** Read ONE row (e.g., one embedding vector) assuming row-major contiguous. */
  static async readTensorRowF32(
    filePath: string,
    index: SafetensorsIndex,
    name: string,
    rowIndex: number,
    rowSize: number, // e.g. dimensions
  ): Promise<Float32Array> {
    const info = index.tensors.get(name);
    if (!info) throw new Error(`Tensor not found: ${name}`);
    if (info.dtype !== "F32")
      throw new Error(`Expected F32 tensor, got ${info.dtype}`);

    // For embeddings shaped [numWords, dims]
    // row byte offset = rowIndex * rowSize * 4
    const bpe = bytesPerElement(info.dtype);
    const byteOffset = rowIndex * rowSize * bpe;
    const byteLength = rowSize * bpe;

    const buf = await this.readTensorBytes(
      filePath,
      index,
      name,
      byteOffset,
      byteLength,
    );
    return new Float32Array(buf.buffer, buf.byteOffset, rowSize);
  }
}
