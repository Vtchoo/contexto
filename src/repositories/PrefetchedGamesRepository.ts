import dataSource from "../../dataSource";
import PrefetchedGame from "../models/PrefetchedGame";

export function getPrefetchedGamesRepository() {
    return dataSource.getRepository(PrefetchedGame);
}
