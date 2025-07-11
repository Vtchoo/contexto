import { ContextoManager } from './ContextoManager'
import { ContextoDefaultGame } from './ContextoDefaultGame'
import { ContextoCompetitiveGame } from './ContextoCompetitiveGame'
import { ContextoStopGame } from './ContextoStopGame'

const gameManager = new ContextoManager()

export default gameManager
export { ContextoDefaultGame, ContextoCompetitiveGame, ContextoStopGame, ContextoManager }
