import { GameState, GameWord, Guess, TeamState } from './interface'
import type { ContextoManager } from './ContextoManager'
import { ContextoBaseGame } from './ContextoBaseGame'

type TeamColor = string

interface TeamRecord {
    id: string
    name: string
    color: TeamColor
    players: Set<string>
    guesses: Guess[]
}

class ContextoTeamsGame extends ContextoBaseGame {
    static readonly PREDEFINED_COLORS: readonly TeamColor[] = [
        '#ef4444',
        '#f97316',
        '#f59e0b',
        '#84cc16',
        '#22c55e',
        '#14b8a6',
        '#06b6d4',
        '#3b82f6',
        '#6366f1',
        '#ec4899',
    ]

    private readonly teams = new Map<string, TeamRecord>()
    private readonly playerTeams = new Map<string, string>()
    private winnerTeamId: string | null = null
    private winnerPlayerId: string | null = null

    finished = false

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date) {
        super(playerId, manager, gameIdOrDate)
        this.allowTips = false
        this.allowGiveUp = true
        this.started = false
    }

    get guessCount(): number {
        let total = 0
        for (const team of this.teams.values()) {
            total += team.guesses.filter(guess => !guess.error).length
        }
        return total
    }

    canStart(): boolean {
        return !this.started && !this.finished && this.players.length > 0 && this.players.every(playerId => this.playerTeams.has(playerId))
    }

    startGame(): void {
        if (this.started) {
            throw new Error('Game has already been started')
        }
        if (this.players.length === 0) {
            throw new Error('Cannot start game with no players')
        }
        if (!this.players.every(playerId => this.playerTeams.has(playerId))) {
            throw new Error('All players must join a team before starting')
        }
        this.started = true
    }

    addPlayer(playerId: string): void {
        if (this.finished) {
            throw new Error('Game has already finished')
        }
        super.addPlayer(playerId)
    }

    removePlayer(playerId: string): void {
        super.removePlayer(playerId)

        const teamId = this.playerTeams.get(playerId)
        if (teamId) {
            const team = this.teams.get(teamId)
            if (team) {
                team.players.delete(playerId)
                if (team.players.size === 0) {
                    this.teams.delete(teamId)
                }
            }
            this.playerTeams.delete(playerId)
        }

        if (this.players.length === 0) {
            this.finished = true
        }
    }

    createTeam(playerId: string, name: string, color: TeamColor): TeamState {
        this.assertPlayerInGame(playerId)

        if (this.started) {
            throw new Error('Cannot create teams after the game has started')
        }

        const normalizedName = name.trim()
        if (normalizedName.length < 2 || normalizedName.length > 24) {
            throw new Error('Team name must have between 2 and 24 characters')
        }

        if (!ContextoTeamsGame.PREDEFINED_COLORS.includes(color)) {
            throw new Error('Invalid team color')
        }

        const nameExists = Array.from(this.teams.values()).some(team => team.name.toLowerCase() === normalizedName.toLowerCase())
        if (nameExists) {
            throw new Error('Team name already exists')
        }

        const teamId = `${this.id}-${this.teams.size + 1}`
        const team: TeamRecord = {
            id: teamId,
            name: normalizedName,
            color,
            players: new Set(),
            guesses: []
        }

        this.teams.set(teamId, team)
        this.joinTeam(playerId, teamId)

        return this.toTeamState(team)
    }

    joinTeam(playerId: string, teamId: string): TeamState {
        this.assertPlayerInGame(playerId)

        const targetTeam = this.teams.get(teamId)
        if (!targetTeam) {
            throw new Error('Team not found')
        }

        const currentTeamId = this.playerTeams.get(playerId)
        if (this.started && currentTeamId && currentTeamId !== teamId) {
            throw new Error('Cannot switch teams after the game has started')
        }

        if (currentTeamId && currentTeamId !== teamId) {
            const currentTeam = this.teams.get(currentTeamId)
            if (currentTeam) {
                currentTeam.players.delete(playerId)
                if (currentTeam.players.size === 0) {
                    this.teams.delete(currentTeamId)
                }
            }
        }

        this.playerTeams.set(playerId, teamId)
        targetTeam.players.add(playerId)
        return this.toTeamState(targetTeam)
    }

    getTeamsState(): TeamState[] {
        return Array.from(this.teams.values())
            .map(team => this.toTeamState(team))
            .sort((a, b) => a.name.localeCompare(b.name))
    }

    getPlayerTeamId(playerId: string): string | undefined {
        return this.playerTeams.get(playerId)
    }

    getTeamPlayers(teamId: string): string[] {
        const team = this.teams.get(teamId)
        if (!team) {
            return []
        }
        return Array.from(team.players)
    }

    getWinnerTeam(): TeamState | null {
        if (!this.winnerTeamId) {
            return null
        }
        const team = this.teams.get(this.winnerTeamId)
        return team ? this.toTeamState(team) : null
    }

    getWinnerPlayerId(): string | null {
        return this.winnerPlayerId
    }

    addGuess(playerId: string, guess: Guess): void {
        this.assertPlayerInGame(playerId)

        const team = this.getPlayerTeam(playerId)
        if (!team) {
            throw new Error('Player must join a team before guessing')
        }

        team.guesses.push(guess)
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        if (!this.started) {
            throw new Error('Game has not been started yet. Use /start to begin the game.')
        }

        if (this.finished) {
            throw new Error('Game has already finished')
        }

        this.assertPlayerInGame(playerId)

        const team = this.getPlayerTeam(playerId)
        if (!team) {
            throw new Error('Join a team before sending guesses')
        }

        const existingGuess = team.guesses.find(guess => guess.word === word || guess.lemma === word)
        if (existingGuess) {
            return existingGuess
        }

        const cachedGuess = await this.processWordFromCache(playerId, word)
        const guess = cachedGuess ?? await this.processWordFromAPI(playerId, word)

        this.addGuess(playerId, guess)

        if (!guess.error && guess.distance === 0) {
            this.finished = true
            this.winnerTeamId = team.id
            this.winnerPlayerId = playerId
        }

        return guess
    }

    getClosestGuesses(playerId: string, count = 10): GameWord[] {
        const team = this.getPlayerTeam(playerId)
        if (!team) {
            return []
        }

        return team.guesses
            .filter(guess => !guess.error)
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
            .slice(0, count)
    }

    getGuessCount(playerId?: string): number {
        if (!playerId) {
            return this.guessCount
        }

        const team = this.getPlayerTeam(playerId)
        if (!team) {
            return 0
        }

        return team.guesses.filter(guess => !guess.error).length
    }

    protected getGuessHistoryForTips(playerId: string): Array<[string, number]> {
        const team = this.getPlayerTeam(playerId)
        if (!team) {
            return []
        }

        return team.guesses
            .filter(guess => !guess.error && guess.distance !== undefined)
            .map(guess => [guess.word, guess.distance!])
    }

    getCurrentGameState(playerId: string): GameState {
        const team = this.getPlayerTeam(playerId)
        const guesses = team
            ? [...team.guesses].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
            : []

        return {
            id: this.id,
            started: this.started,
            finished: this.finished,
            players: this.players,
            guesses,
            teams: this.getTeamsState(),
            playerTeamId: this.playerTeams.get(playerId),
            winnerTeamId: this.winnerTeamId ?? undefined,
        }
    }

    private assertPlayerInGame(playerId: string): void {
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }
    }

    private getPlayerTeam(playerId: string): TeamRecord | undefined {
        const teamId = this.playerTeams.get(playerId)
        if (!teamId) {
            return undefined
        }
        return this.teams.get(teamId)
    }

    private toTeamState(team: TeamRecord): TeamState {
        const closestDistance = team.guesses
            .filter(guess => !guess.error && guess.distance !== undefined)
            .reduce((closest, guess) => {
                if (closest === undefined) {
                    return guess.distance
                }
                return Math.min(closest, guess.distance!)
            }, undefined as number | undefined)

        return {
            id: team.id,
            name: team.name,
            color: team.color,
            players: Array.from(team.players),
            guessCount: team.guesses.filter(guess => !guess.error).length,
            closestDistance,
            won: this.winnerTeamId === team.id,
        }
    }
}

export { ContextoTeamsGame }