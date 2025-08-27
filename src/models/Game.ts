import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { GameGuess } from "./GameGuess"

export type GameMode = 'default' | 'coop' | 'competitive' | 'stop' | 'battle-royale'

@Entity('games')
export class Game {
    @PrimaryColumn('varchar', { length: 255 })
    id: string

    @Column('int')
    gameId: number

    @Column('boolean', { default: false })
    started: boolean

    @Column('boolean', { default: false })
    finished: boolean

    @Column('enum', { 
        enum: ['default', 'coop', 'competitive', 'stop', 'battle-royale'], 
        default: 'default'
    })
    gameMode: GameMode

    @Column('boolean', { default: true })
    allowTips: boolean

    @Column('boolean', { default: true })
    allowGiveUp: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @OneToMany(() => GameGuess, guess => guess.game, { cascade: true })
    guesses: GameGuess[]
}
