import dotenv from 'dotenv'
import zod from 'zod'

dotenv.config()

const parser = zod.object({
    CLIENT_ID: zod.string(),
    TOKEN: zod.string(),
    DB_SSL: zod.coerce.boolean().optional(),
    DB_ENG: zod.string(),
    DB_HOST: zod.string(),
    DB_PORT: zod.coerce.number(),
    DB_USER: zod.string(),
    DB_PASS: zod.string(),
    DB_NAME: zod.string(),
    MIN_FEED_INTERVAL: zod.coerce.number().optional()
})

const env = parser.parse(process.env)

export default env
