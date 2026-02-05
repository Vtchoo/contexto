import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm"

export class CreatePlayersTable1753406097365 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'players',
                columns: [
                    { name: 'id', type: 'varchar', length: '255', isPrimary: true, isNullable: false },
                    { name: 'username', type: 'varchar', length: '50', isNullable: true },
                    { name: 'last_activity', type: 'bigint', isNullable: false },
                    { name: 'games_played', type: 'int', default: 0, isNullable: false },
                    { name: 'games_won', type: 'int', default: 0, isNullable: false },
                    { name: 'average_guesses', type: 'decimal', precision: 10, scale: 2, default: 0, isNullable: false },
                    { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', isNullable: false },
                    { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP', isNullable: false }
                ],
                indices: [
                    new TableIndex({
                        name: 'IDX_players_last_activity',
                        columnNames: ['last_activity']
                    })
                ]
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('players')
    }

}
