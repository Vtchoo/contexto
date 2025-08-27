import dataSource from '../../dataSource'
import { Game } from '../models/Game'
import { GameGuess } from '../models/GameGuess'

function getGamesRepository() {
    return dataSource.getRepository(Game)
}

function getGameGuessesRepository() {
    return dataSource.getRepository(GameGuess)
}

export { getGamesRepository, getGameGuessesRepository }
