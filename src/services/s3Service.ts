import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import path from 'path';

export class S3Service {
    private s3Client: S3Client;
    private bucketName: string;
    private region: string;
    private endpoint: string;

    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.endpoint = process.env.AWS_S3_ENDPOINT || '';
        this.bucketName = process.env.AWS_S3_BUCKET || '';

        if (!this.bucketName) {
            console.warn('AWS_S3_BUCKET environment variable is not set. Avatar upload functionality will not work.');
        }

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.warn('AWS credentials not provided. Avatar upload functionality will not work.');
        }

        this.s3Client = new S3Client({
            forcePathStyle: true,
            region: this.region,
            endpoint: this.endpoint,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            }
        });
    }

    isConfigured(): boolean {
        return !!(this.bucketName && 
                 process.env.AWS_ACCESS_KEY_ID && 
                 process.env.AWS_SECRET_ACCESS_KEY);
    }

    async uploadAvatar(file: Express.Multer.File, userId: string): Promise<string> {
        if (!this.isConfigured()) {
            throw new Error('S3 service is not properly configured. Please set AWS environment variables.');
        }

        const fileExtension = path.extname(file.originalname);
        const fileName = `avatars/${userId}/${crypto.randomUUID()}${fileExtension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            CacheControl: 'max-age=31536000', // Cache for 1 year
        });

        await this.s3Client.send(command);

        // Return the public URL
        // return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
        return `${this.endpoint.replace('/s3', '/object/public')}/${this.bucketName}/${fileName}`;
    }

    async deleteAvatar(avatarUrl: string): Promise<void> {
        try {
            // Extract the key from the URL
            const url = new URL(avatarUrl);
            const key = url.pathname.substring(1); // Remove leading slash

            const command = new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            await this.s3Client.send(command);
        } catch (error) {
            console.error('Error deleting avatar from S3:', error);
            // Don't throw error here, as we don't want to prevent user updates
            // if old avatar deletion fails
        }
    }

    validateImageFile(file: Express.Multer.File): { isValid: boolean; error?: string } {
        // Check file type
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return {
                isValid: false,
                error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
            };
        }

        // Check file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            return {
                isValid: false,
                error: 'File too large. Maximum size is 5MB.'
            };
        }

        return { isValid: true };
    }
}

export default new S3Service();