import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'

@Entity('cached_words')
@Index(['gameId', 'word'], { unique: true })
class CachedWord {
    @PrimaryGeneratedColumn()
    id: number

    @Column()
    gameId: number

    @Column()
    word: string

    @Column({ nullable: true })
    lemma?: string

    @Column({ nullable: true })
    distance?: number

    @Column({ nullable: true })
    error?: string

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
}

export { CachedWord }
