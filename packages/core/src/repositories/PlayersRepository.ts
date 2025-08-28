import { Repository } from "typeorm"
import { dataSource } from "../database"
import { Player } from "../models/Player"

let playerRepository: Repository<Player>

export function getPlayerRepository(): Repository<Player> {
    if (!playerRepository) {
        playerRepository = dataSource.getRepository(Player)
    }
    return playerRepository
}
