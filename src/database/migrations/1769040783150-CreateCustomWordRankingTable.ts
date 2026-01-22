import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateCustomWordRankingTable1769040783150 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'custom_word_ranking',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'targetWordId',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'wordId',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'rankingScore',
                        type: 'int',
                        isNullable: false,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['targetWordId'],
                        referencedTableName: 'words',
                        referencedColumnNames: ['id'],
                        onDelete: 'RESTRICT',
                    },
                    {
                        columnNames: ['wordId'],
                        referencedTableName: 'words',
                        referencedColumnNames: ['id'],
                        onDelete: 'RESTRICT',
                    },
                ],
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('custom_word_ranking');
    }

}
