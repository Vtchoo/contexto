import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateGamesAndGuessesTable1755132913021 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create games table
        await queryRunner.createTable(
            new Table({
                name: 'games',
                columns: [
                    { 
                        name: 'id', 
                        type: 'varchar', 
                        isNullable: false, 
                        isPrimary: true,
                        comment: 'Unique game room ID'
                    },
                    { 
                        name: 'gameId', 
                        type: 'int', 
                        isNullable: false,
                        comment: 'Contexto API game ID'
                    },
                    { 
                        name: 'started', 
                        type: 'boolean', 
                        default: false,
                        comment: 'Whether the game has been started'
                    },
                    { 
                        name: 'finished', 
                        type: 'boolean', 
                        default: false,
                        comment: 'Whether the game has finished'
                    },
                    { 
                        name: 'gameMode', 
                        type: 'enum', 
                        enum: ['default', 'coop', 'competitive', 'stop', 'battle-royale'], 
                        default: "'default'",
                        comment: 'Game mode type'
                    },
                    { 
                        name: 'allowTips', 
                        type: 'boolean', 
                        default: true,
                        comment: 'Whether tips are allowed in this game'
                    },
                    { 
                        name: 'allowGiveUp', 
                        type: 'boolean', 
                        default: true,
                        comment: 'Whether giving up is allowed in this game'
                    },
                    { 
                        name: 'createdAt', 
                        type: 'timestamp', 
                        default: 'CURRENT_TIMESTAMP',
                        comment: 'When the game was created'
                    },
                    { 
                        name: 'updatedAt', 
                        type: 'timestamp', 
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                        comment: 'When the game was last updated'
                    }
                ]
            })
        )

        // Create game_guesses table
        await queryRunner.createTable(
            new Table({
                name: 'game_guesses',
                columns: [
                    { 
                        name: 'id', 
                        type: 'int', 
                        isPrimary: true, 
                        isGenerated: true, 
                        generationStrategy: 'increment',
                        comment: 'Auto-increment ID for the guess'
                    },
                    { 
                        name: 'gameId', 
                        type: 'varchar', 
                        isNullable: false,
                        comment: 'Reference to the game this guess belongs to'
                    },
                    { 
                        name: 'addedBy', 
                        type: 'varchar', 
                        isNullable: false,
                        comment: 'Player ID who made this guess'
                    },
                    { 
                        name: 'word', 
                        type: 'varchar', 
                        isNullable: false,
                        comment: 'The guessed word'
                    },
                    { 
                        name: 'lemma', 
                        type: 'varchar', 
                        isNullable: true,
                        comment: 'The lemma form of the word'
                    },
                    { 
                        name: 'distance', 
                        type: 'int', 
                        isNullable: true,
                        comment: 'Distance from the target word (null for errors)'
                    },
                    { 
                        name: 'error', 
                        type: 'text', 
                        isNullable: true,
                        comment: 'Error message if the guess was invalid'
                    },
                    { 
                        name: 'hidden', 
                        type: 'boolean', 
                        default: false,
                        comment: 'Whether this guess is hidden from other players'
                    },
                    { 
                        name: 'createdAt', 
                        type: 'timestamp', 
                        default: 'CURRENT_TIMESTAMP',
                        comment: 'When the guess was made'
                    }
                ],
                foreignKeys: [
                    {
                        name: 'FK_guess_game',
                        columnNames: ['gameId'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'games',
                        onUpdate: 'CASCADE',
                        onDelete: 'CASCADE'
                    }
                ],
                indices: [
                    {
                        name: 'IDX_game_guesses_gameId',
                        columnNames: ['gameId']
                    },
                    {
                        name: 'IDX_game_guesses_addedBy',
                        columnNames: ['addedBy']
                    },
                    {
                        name: 'IDX_game_guesses_distance',
                        columnNames: ['distance']
                    }
                ]
            })
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('game_guesses')
        await queryRunner.dropTable('games')
    }

}
