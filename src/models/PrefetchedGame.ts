import { CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity('prefetched_games')
class PrefetchedGame {
    @PrimaryColumn() id: number
    @CreateDateColumn() createdAt: Date
}

export default PrefetchedGame;
