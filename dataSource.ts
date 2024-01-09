import { DataSource } from "typeorm"
import env from "./env"

type DBType = "mysql" | "mariadb" | "postgres" | "cockroachdb" | "sqlite" | "mssql" | "sap" | "oracle" | "cordova" | "nativescript" | "react-native" | "sqljs" | "mongodb" | "expo" | "better-sqlite3"
type MySQLType = 'mysql' | 'mariadb'

const dataSource = new DataSource({
    ssl: env.DB_SSL ? { rejectUnauthorized: false } : undefined,
    type: env.DB_ENG as any,
    host: env.DB_HOST,
    port: env.DB_PORT,
    username: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    logging: false,
    migrations: [__dirname + '/src/database/migrations/**{.ts,.js}'],
    entities: [__dirname + '/src/models/**{.ts,.js}'],
    // cli: {
    //     migrationsDir: './src/database/migrations',
    // },
    migrationsRun: false,
    //timezone: 'Z'
})

export default dataSource
