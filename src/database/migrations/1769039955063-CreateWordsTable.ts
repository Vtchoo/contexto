import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateWordsTable1769039955063 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'words',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'word',
                        type: 'varchar',
                        length: '100',
                        // isUnique: true,
                        isNullable: false
                    },
                    {
                        name: 'icf',
                        type: 'decimal',
                        precision: 10,
                        scale: 8,
                        isNullable: true
                    }
                ],
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('words');
    }

}
