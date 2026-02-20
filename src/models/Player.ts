import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity('players')
export class Player {
    @PrimaryColumn('varchar', { length: 255 })
    id: string

    @Column('varchar', { length: 50, nullable: true, unique: true })
    username: string | null

    @Column('bigint', { name: 'last_activity' })
    lastActivity: number

    @Column('int', { name: 'games_played', default: 0 })
    gamesPlayed: number

    @Column('int', { name: 'games_won', default: 0 })
    gamesWon: number

    @Column('decimal', { precision: 10, scale: 2, name: 'average_guesses', default: 0 })
    averageGuesses: number

    @Column('varchar', { length: 500, nullable: true, name: 'avatar_url' })
    avatarUrl: string | null
    
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date

    constructor(id?: string, username?: string) {
        if (id) {
            this.id = id
            this.username = username || null
            this.lastActivity = Date.now()
            this.gamesPlayed = 0
            this.gamesWon = 0
            this.averageGuesses = 0
        }
    }

    setUsername(username: string): void {
        this.username = username
        this.updateActivity()
    }

    updateActivity(): void {
        this.lastActivity = Date.now()
    }

    isActive(): boolean {
        // Consider user active if accessed in last 24 hours
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
        return this.lastActivity > oneDayAgo
    }

    incrementGamesPlayed(): void {
        this.gamesPlayed++
        this.updateActivity()
    }

    incrementGamesWon(): void {
        this.gamesWon++
        this.updateActivity()
    }

    updateAverageGuesses(guesses: number): void {
        if (this.gamesPlayed === 0) {
            this.averageGuesses = guesses
        } else {
            this.averageGuesses = ((this.averageGuesses * (this.gamesPlayed - 1)) + guesses) / this.gamesPlayed
        }
        this.updateActivity()
    }

    getWinRate(): number {
        if (this.gamesPlayed === 0) return 0
        return (this.gamesWon / this.gamesPlayed) * 100
    }

    getStats() {
        return {
            id: this.id,
            username: this.username,
            gamesPlayed: this.gamesPlayed,
            gamesWon: this.gamesWon,
            winRate: this.getWinRate(),
            averageGuesses: Math.round(this.averageGuesses * 100) / 100,
            isActive: this.isActive(),
            lastActivity: this.lastActivity
        }
    }

    toJSON() {
        return {
            id: this.id,
            username: this.username,
            gamesPlayed: this.gamesPlayed,
            gamesWon: this.gamesWon,
            winRate: this.getWinRate(),
            averageGuesses: Math.round(this.averageGuesses * 100) / 100,
            isActive: this.isActive(),
            avatarUrl: this.avatarUrl,
        }
    }
}
