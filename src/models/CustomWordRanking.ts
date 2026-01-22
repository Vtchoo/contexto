import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne } from 'typeorm'
import { Word } from './Word'

@Entity('custom_word_ranking')
export class CustomWordRanking {
    @PrimaryGeneratedColumn()
    id: number

    @Column('int')
    targetWordId: number

    @Column('int')
    wordId: number

    @Column('int')
    rankingScore: number

    @ManyToOne(() => Word, (word) => word.customRankings, { onDelete: 'CASCADE' })
    word: Word
}