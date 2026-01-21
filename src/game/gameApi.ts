import axios from 'axios';

type GameApiType = "default" | "custom";

interface GameApiOptions {
    type?: GameApiType;
}

interface GameApiInstance {
    play: (word: string) => Promise<any>;
    tip: (distance: number) => Promise<any>;
    giveUp: () => Promise<any>;
    getClosestWords: () => Promise<any>;
}

const GameApi = (language = 'pt-br', gameId: number, options?: GameApiOptions) => {
    const type = options?.type;
    switch (type) {
        case "custom":
            // Future implementation for custom game API can be added here
            throw new Error("Custom game API is not implemented yet.");
        case "default":
        default:
            return defaultGameApi(language, gameId);
    }
}

const defaultGameApi = (language = 'pt-br', gameId: number) => {
    const baseUrl = 'https://api.contexto.me/machado';

    const play = (word: string) => axios.get(`${baseUrl}/${language}/game/${gameId}/${word}`);

    const tip = (distance: number) => axios.get(`${baseUrl}/${language}/tip/${gameId}/${distance}`);

    const giveUp = () => axios.get(`${baseUrl}/${language}/giveup/${gameId}`);

    const getClosestWords = () => axios.get(`${baseUrl}/${language}/top/${gameId}`);

    return {
        play,
        tip,
        giveUp,
        getClosestWords,
    } as GameApiInstance;
};

export default GameApi;
