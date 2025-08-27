import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm"
import { Game } from "./Game"

@Entity('game_guesses')
export class GameGuess {
    @PrimaryGeneratedColumn()
    id: number

    @Column('varchar', { length: 255 })
    gameId: string

    @Column('varchar', { length: 255 })
    addedBy: string

    @Column('varchar', { length: 255 })
    word: string

    @Column('varchar', { length: 255, nullable: true })
    lemma: string | null

    @Column('int', { nullable: true })
    distance: number | null

    @Column('text', { nullable: true })
    error: string | null

    @Column('boolean', { default: false })
    hidden: boolean

    @CreateDateColumn()
    createdAt: Date

    @ManyToOne(() => Game, game => game.guesses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'gameId' })
    game: Game
}
