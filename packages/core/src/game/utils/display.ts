const displayGameId = (gameId: number) => {
    if (gameId >= 10000) {
        return gameId - 10000;
    }
    return gameId;
};

export { displayGameId };
