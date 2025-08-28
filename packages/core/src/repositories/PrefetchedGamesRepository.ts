import { dataSource } from "../database";
import PrefetchedGame from "../models/PrefetchedGame";

export function getPrefetchedGamesRepository() {
    return dataSource.getRepository(PrefetchedGame);
}
