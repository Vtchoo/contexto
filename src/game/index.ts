import { ContextoManager } from './ContextoManager'
import { ContextoDefaultGame } from './ContextoDefaultGame'
import { ContextoCompetitiveGame } from './ContextoCompetitiveGame'
import { ContextoStopGame } from './ContextoStopGame'
import { ContextoBattleRoyaleGame } from './ContextoBattleRoyaleGame'
import { ContextoTeamsGame } from './ContextoTeamsGame'

const gameManager = new ContextoManager()

export default gameManager
export { ContextoDefaultGame, ContextoCompetitiveGame, ContextoStopGame, ContextoBattleRoyaleGame, ContextoTeamsGame, ContextoManager }
