import { GameState, GameWord, Guess, PlayerScore } from './interface'
import type { ContextoManager } from './ContextoManager'
import { ContextoBaseGame } from './ContextoBaseGame'

interface Team {
    id: string
    name: string
    players: string[]
    guesses: Guess[]
    completed: boolean
    completionTime?: Date
    color?: string
}

interface TeamScore {
    teamId: string
    teamName: string
    guessCount: number
    closestDistance: number
    completed: boolean
    completionTime?: Date
}

class ContextoTeamGame extends ContextoBaseGame {
    private teams: Map<string, Team> = new Map() // teamId -> Team
    private playerTeams: Map<string, string> = new Map() // playerId -> teamId
    private winningTeam: Team | null = null
    finished = false

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date) {
        super(playerId, manager, gameIdOrDate)
        
        // Team game specific settings
        this.allowTips = true // Tips are allowed
        this.allowGiveUp = true // Teams can give up
        this.started = false // Team games start unstarted - must be explicitly started
        
        // First player must create a team
        // This will be handled by the team creation logic
    }

    // Check if the game can be started (only if not started and has multiple teams)
    canStart(): boolean {
        return !this.started && this.teams.size >= 2
    }

    // Start the team game - override base implementation
    startGame(): void {
        if (this.started) {
            throw new Error("Game has already been started")
        }
        if (this.teams.size === 0) {
            throw new Error("Cannot start game with no teams")
        }
        if (this.teams.size < 2) {
            throw new Error("Cannot start game with less than 2 teams")
        }
        this.started = true
    }

    // Create a new team
    createTeam(playerId: string, teamName: string, color?: string): string {
        if (this.finished) {
            throw new Error("Game has already finished")
        }
        
        // Check if player is already on a team
        if (this.playerTeams.has(playerId)) {
            throw new Error(`Player ${playerId} is already on a team`)
        }

        // Validate team name
        if (!teamName || teamName.trim().length === 0) {
            throw new Error("Team name cannot be empty")
        }

        const trimmedName = teamName.trim()
        
        // Check if team name already exists (case-insensitive)
        const existingTeam = Array.from(this.teams.values()).find(
            team => team.name.toLowerCase() === trimmedName.toLowerCase()
        )
        if (existingTeam) {
            throw new Error(`Team name "${trimmedName}" already exists`)
        }

        // Generate team ID
        const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Create new team
        const team: Team = {
            id: teamId,
            name: trimmedName,
            players: [playerId],
            guesses: [],
            completed: false,
            color: color
        }

        this.teams.set(teamId, team)
        this.playerTeams.set(playerId, teamId)
        this.addPlayer(playerId)

        return teamId
    }

    // Join an existing team
    joinTeam(playerId: string, teamIdentifier: string): void {
        if (this.finished) {
            throw new Error("Game has already finished")
        }

        // Check if player is already on a team
        if (this.playerTeams.has(playerId)) {
            throw new Error(`Player ${playerId} is already on a team`)
        }

        // Find team by ID or name (case-insensitive)
        let team: Team | undefined
        if (this.teams.has(teamIdentifier)) {
            team = this.teams.get(teamIdentifier)
        } else {
            team = Array.from(this.teams.values()).find(
                t => t.name.toLowerCase() === teamIdentifier.toLowerCase()
            )
        }

        if (!team) {
            throw new Error(`Team "${teamIdentifier}" not found`)
        }

        // Check if team is already completed
        if (team.completed) {
            throw new Error(`Team "${team.name}" has already completed the game`)
        }

        // Add player to team
        team.players.push(playerId)
        this.playerTeams.set(playerId, team.id)
        this.addPlayer(playerId)
    }

    // Override addPlayer to ensure proper team assignment
    addPlayer(playerId: string): void {
        if (this.players.includes(playerId)) {
            console.log(`Player ${playerId} is already in the game`)
            return
        }
        this.players.push(playerId)
    }

    // Override removePlayer to handle team cleanup
    removePlayer(playerId: string): void {
        super.removePlayer(playerId)
        
        const teamId = this.playerTeams.get(playerId)
        if (teamId) {
            const team = this.teams.get(teamId)
            if (team) {
                // Remove player from team
                const playerIndex = team.players.indexOf(playerId)
                if (playerIndex !== -1) {
                    team.players.splice(playerIndex, 1)
                }
                
                // If team is now empty, remove the team
                if (team.players.length === 0) {
                    this.teams.delete(teamId)
                }
            }
            this.playerTeams.delete(playerId)
        }
    }

    // Get player's team
    getPlayerTeam(playerId: string): Team | undefined {
        const teamId = this.playerTeams.get(playerId)
        return teamId ? this.teams.get(teamId) : undefined
    }

    // Get all teams (for listing)
    getTeams(): Team[] {
        return Array.from(this.teams.values())
    }

    // Implement abstract method for tip calculation
    protected getGuessHistoryForTips(playerId: string): Array<[string, number]> {
        const team = this.getPlayerTeam(playerId)
        if (!team) {
            return []
        }
        
        return team.guesses
            .filter(guess => !guess.error && guess.distance !== undefined)
            .map(guess => [guess.word, guess.distance!])
    }

    addGuess(playerId: string, guess: Guess): void {
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }
        
        const team = this.getPlayerTeam(playerId)
        if (!team) {
            throw new Error(`Player ${playerId} is not on a team`)
        }
        
        if (team.completed) {
            throw new Error(`Team "${team.name}" has already completed the game`)
        }
        
        team.guesses.push(guess)
        
        // Check if team found the word
        if (!guess.error && guess.distance === 0) {
            team.completed = true
            team.completionTime = new Date()
            this.winningTeam = team
            this.finished = true
        }
    }

    // Get existing guess from team's guesses
    getExistingGuess(word: string, playerId: string): Guess | undefined {
        const team = this.getPlayerTeam(playerId)
        if (!team) {
            return undefined
        }
        
        return team.guesses.find(guess => guess.word === word || guess.lemma === word)
    }

    // Get team's current guess count
    getGuessCount(playerId: string): number {
        const team = this.getPlayerTeam(playerId)
        if (!team) {
            return 0
        }
        
        return team.guesses.filter(guess => !guess.error).length
    }

    // Legacy getter for compatibility - total guesses across all teams
    get guessCount(): number {
        let totalGuesses = 0
        for (const team of this.teams.values()) {
            totalGuesses += team.guesses.filter(guess => !guess.error).length
        }
        return totalGuesses
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        if (!this.started) {
            throw new Error("Game has not been started yet")
        }

        if (this.finished) {
            throw new Error("Game has already finished")
        }
        
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        const team = this.getPlayerTeam(playerId)
        if (!team) {
            throw new Error(`Player ${playerId} is not on a team`)
        }

        if (team.completed) {
            throw new Error(`Team "${team.name}" has already completed the game`)
        }

        // Check if word was already tried by this team
        const existingGuess = this.getExistingGuess(word, playerId)
        if (existingGuess) {
            throw new Error(`Team "${team.name}" has already tried the word "${word}"`)
        }

        // Try to get word from cache first
        const cachedGuess = await this.processWordFromCache(playerId, word)
        if (cachedGuess) {
            this.addGuess(playerId, cachedGuess)
            return cachedGuess
        }

        // Process word from API
        const guess = await this.processWordFromAPI(playerId, word)
        this.addGuess(playerId, guess)

        return guess
    }

    getClosestGuesses(playerId: string, count?: number): GameWord[] {
        // Show only guesses made by the player's team
        const team = this.getPlayerTeam(playerId)
        if (!team) {
            return []
        }
        
        return team.guesses
            .filter(guess => !guess.error) // Filter out invalid guesses
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) // Sort by distance
            .slice(0, count ?? 10) // Limit to the closest guesses
    }

    // Get other teams' best guesses (without showing the words)
    getOtherTeamsBestGuesses(playerId: string): Array<{ teamName: string; bestDistance: number; guessCount: number }> {
        const playerTeam = this.getPlayerTeam(playerId)
        if (!playerTeam) {
            return []
        }

        const result: Array<{ teamName: string; bestDistance: number; guessCount: number }> = []
        
        for (const team of this.teams.values()) {
            if (team.id === playerTeam.id) {
                continue // Skip player's own team
            }
            
            const validGuesses = team.guesses.filter(guess => !guess.error && guess.distance !== undefined)
            if (validGuesses.length === 0) {
                continue // Skip teams with no valid guesses
            }
            
            const bestDistance = Math.min(...validGuesses.map(guess => guess.distance!))
            
            result.push({
                teamName: team.name,
                bestDistance,
                guessCount: validGuesses.length
            })
        }
        
        return result.sort((a, b) => a.bestDistance - b.bestDistance)
    }

    // Get team rankings
    getTeamRankings(): TeamScore[] {
        const rankings: TeamScore[] = []
        
        for (const team of this.teams.values()) {
            const validGuesses = team.guesses.filter(guess => !guess.error && guess.distance !== undefined)
            
            if (validGuesses.length === 0) {
                continue // Skip teams with no valid guesses
            }
            
            const closestDistance = Math.min(...validGuesses.map(guess => guess.distance!))
            
            rankings.push({
                teamId: team.id,
                teamName: team.name,
                guessCount: validGuesses.length,
                closestDistance,
                completed: team.completed,
                completionTime: team.completionTime
            })
        }
        
        // Sort by completion status first, then by closest distance, then by guess count
        return rankings.sort((a, b) => {
            if (a.completed && !b.completed) return -1
            if (!a.completed && b.completed) return 1
            if (a.completed && b.completed) {
                // Both completed - sort by completion time
                if (a.completionTime && b.completionTime) {
                    return a.completionTime.getTime() - b.completionTime.getTime()
                }
            }
            // Sort by closest distance
            if (a.closestDistance !== b.closestDistance) {
                return a.closestDistance - b.closestDistance
            }
            // Sort by guess count (fewer guesses is better)
            return a.guessCount - b.guessCount
        })
    }

    // Check if a player's team has completed the game
    hasPlayerCompleted(playerId: string): boolean {
        const team = this.getPlayerTeam(playerId)
        return team ? team.completed : false
    }

    getCurrentGameState(playerId: string): GameState {
        const team = this.getPlayerTeam(playerId)
        
        return {
            id: this.id,
            started: this.started,
            finished: this.finished,
            players: this.players,
            guesses: team ? team.guesses : [],
            ranking: this.getTeamRankings().map(team => ({
                playerId: team.teamId, // Using teamId as playerId for compatibility
                guessCount: team.guessCount,
                closestDistance: team.closestDistance,
                completedAt: team.completionTime
            }))
        }
    }
}

export { ContextoTeamGame, Team, TeamScore }