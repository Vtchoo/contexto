import fs from 'fs'
import path from 'path'

/**
 * Manual safetensors reader implementation
 * This gives you full control over the parsing process
 */
export class ManualSafetensorsReader {

    /**
     * Read and parse a safetensors file manually
     */
    static async readSafetensorsFile(filePath: string): Promise<{
        metadata: any,
        tensors: Map<string, {
            dtype: string,
            shape: number[],
            data_offsets: [number, number],
            data?: Float32Array | Int32Array | Uint8Array
        }>
    }> {
        const buffer = await fs.promises.readFile(filePath)

        // Read header length (first 8 bytes, little-endian uint64)
        const headerLength = Number(buffer.readBigUInt64LE(0))

        // Read and parse JSON header
        const headerBuffer = buffer.slice(8, 8 + headerLength)
        const header = JSON.parse(headerBuffer.toString('utf-8'))

        console.log('Safetensors header:', JSON.stringify(header, null, 2))

        // Extract metadata and tensor info
        const { __metadata__, ...tensorInfo } = header
        const metadata = __metadata__ || {}

        // Map to store tensor information
        const tensors = new Map()

        // Process each tensor
        for (const [tensorName, info] of Object.entries(tensorInfo as any)) {
            const { dtype, shape, data_offsets } = info as any

            tensors.set(tensorName, {
                dtype,
                shape,
                data_offsets,
                // We can load the actual data lazily when needed
            })
        }

        return { metadata, tensors }
    }

    /**
     * Extract tensor data from the safetensors file
     */
    static async extractTensorData(
        filePath: string,
        tensorName: string,
        tensorInfo: any
    ): Promise<Float32Array | Int32Array | Uint8Array> {
        const buffer = await fs.promises.readFile(filePath)

        // Calculate data offset (8 bytes for header length + header length)
        const headerLength = Number(buffer.readBigUInt64LE(0))
        const dataStartOffset = 8 + headerLength

        const [startOffset, endOffset] = tensorInfo.data_offsets
        const actualStart = dataStartOffset + startOffset
        const actualEnd = dataStartOffset + endOffset

        // Extract the tensor data slice
        const tensorBuffer = buffer.slice(actualStart, actualEnd)

        // Convert based on dtype
        switch (tensorInfo.dtype) {
            case 'F32':
                return new Float32Array(
                    tensorBuffer.buffer,
                    tensorBuffer.byteOffset,
                    tensorBuffer.length / 4
                )
            case 'I32':
                return new Int32Array(
                    tensorBuffer.buffer,
                    tensorBuffer.byteOffset,
                    tensorBuffer.length / 4
                )
            case 'U8':
                return new Uint8Array(tensorBuffer)
            default:
                throw new Error(`Unsupported dtype: ${tensorInfo.dtype}`)
        }
    }
}

/**
 * Example usage for your specific embeddings
 */
export async function readEmbeddingsExample() {
    const embeddingFiles = [
        'embeddings-glove-100.safetensors',
        'embeddings-glove-300.safetensors',
        'embeddings-glove-600.safetensors'
    ]

    for (const filename of embeddingFiles) {
        const filePath = path.join('data', filename)

        try {
            console.log(`\n--- Reading ${filename} ---`)
            const result = await ManualSafetensorsReader.readSafetensorsFile(filePath)

            console.log('Metadata:', result.metadata)
            console.log('Available tensors:', Array.from(result.tensors.keys()))

            // Print info about each tensor
            for (const [name, info] of result.tensors) {
                console.log(`Tensor "${name}":`, {
                    dtype: info.dtype,
                    shape: info.shape,
                    data_size: info.data_offsets[1] - info.data_offsets[0],
                    elements: info.shape.reduce((a, b) => a * b, 1)
                })

                // Load a small sample of the data
                if (info.shape.reduce((a, b) => a * b, 1) < 100000) { // Only for small tensors
                    const data = await ManualSafetensorsReader.extractTensorData(filePath, name, info)
                    console.log(`First 10 values:`, Array.from(data.slice(0, 10)))
                }
            }

        } catch (error) {
            console.error(`Error reading ${filename}:`, error)
        }
    }
}