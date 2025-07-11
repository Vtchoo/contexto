import { ContextoManager } from './ContextoManager'
import { ContextoDefaultGame } from './ContextoDefaultGame'
import { ContextoCompetitiveGame } from './ContextoCompetitiveGame'

const gameManager = new ContextoManager()

export default gameManager
export { ContextoDefaultGame, ContextoCompetitiveGame, ContextoManager }
