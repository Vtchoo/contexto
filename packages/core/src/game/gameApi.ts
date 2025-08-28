import axios from 'axios';

const GameApi = (language = 'pt-br', gameId: number) => {
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
    };
};

export default GameApi;
