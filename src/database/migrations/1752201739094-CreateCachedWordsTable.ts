import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateCachedWordsTable1752201739094 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "cached_words",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment",
                },
                {
                    name: "gameId",
                    type: "int",
                    isNullable: false,
                },
                {
                    name: "word",
                    type: "varchar",
                    length: "255",
                    isNullable: false,
                },
                {
                    name: "lemma",
                    type: "varchar",
                    length: "255",
                    isNullable: true,
                },
                {
                    name: "distance",
                    type: "int",
                    isNullable: true,
                },
                {
                    name: "error",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                },
                {
                    name: "updatedAt",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP",
                }
            ],
        }), true)

        // Create unique index on gameId + word combination
        await queryRunner.createIndex("cached_words", new TableIndex({
            name: "IDX_CACHED_WORDS_GAME_WORD",
            columnNames: ["gameId", "word"],
            isUnique: true
        }))
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("cached_words")
    }

}
