import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAvatarUrlToPlayers1770934806199 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("players", new TableColumn({
            name: "avatar_url",
            type: "varchar",
            length: "500",
            isNullable: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("players", "avatar_url");
    }

}
