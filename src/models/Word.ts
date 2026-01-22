import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from 'typeorm'
import { CustomWordRanking } from './CustomWordRanking'

@Entity('words')
@Index(['word'], { unique: true })
export class Word {
    @PrimaryGeneratedColumn()
    id: number

    @Column('varchar', { length: 100, unique: true })
    word: string

    @Column('decimal', { precision: 10, scale: 8, nullable: true })
    icf: number | null

    @OneToMany(() => CustomWordRanking, (customRanking) => customRanking.word)
    customRankings: CustomWordRanking[]

    constructor(word?: string, icf?: number) {
        if (word) {
            this.word = word.toLowerCase()
            this.icf = icf || null
        }
    }
}