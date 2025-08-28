import dotenv from 'dotenv'
import zod from 'zod'
import path from 'path'

// Look for .env file in the monorepo root, not the package directory
dotenv.config({ 
    path: path.resolve(__dirname, '../../../.env') 
})

const parser = zod.object({
    // Discord Bot (optional for web-only deployment)
    CLIENT_ID: zod.string().optional(),
    TOKEN: zod.string().optional(),
    
    // Database (required)
    DB_SSL: zod.coerce.boolean().optional().default(false),
    DB_ENG: zod.string().default('postgres'),
    DB_HOST: zod.string(),
    DB_PORT: zod.coerce.number().default(5432),
    DB_USER: zod.string(),
    DB_PASS: zod.string(),
    DB_NAME: zod.string(),
    
    // Web Server
    JWT_SECRET: zod.string().default('your-secret-key-change-in-production'),
    PORT: zod.coerce.number().optional().default(3001),
    NODE_ENV: zod.string().optional().default('development'),
    FRONTEND_URL: zod.string().optional(),
    
    // Feed settings (optional)
    MIN_FEED_INTERVAL: zod.coerce.number().optional()
})

const env = parser.parse(process.env)

export default env
