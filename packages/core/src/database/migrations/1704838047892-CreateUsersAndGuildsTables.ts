import { MigrationInterface, QueryRunner, Table } from "typeorm"

export class CreateUsersAndGuildsTables1704838047892 implements MigrationInterface {

    
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'guilds',
                columns: [
                    { name: 'id', type: 'varchar', isNullable: false, isPrimary: true }
                ]
            })
        )

        await queryRunner.createTable(
            new Table({
                name: 'guild_members',
                columns: [
                    { name: 'id', type: 'varchar', isNullable: false, isPrimary: true },
                    { name: 'guildId', type: 'varchar', isNullable: false, isPrimary: true },
                    { name: 'name', type: 'varchar', isNullable: false },
                    { name: 'role', type: 'enum', enum: ['user', 'guildAdmin', 'admin'], default: "'user'" }
                ],
                foreignKeys: [
                    {
                        name: 'FK_user_guild',
                        columnNames: ['guildId'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'guilds',
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE'
                    }
                ]
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('guild_members')
        await queryRunner.dropTable('guilds')
    }

}
