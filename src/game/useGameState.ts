// import { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import { getTodaysGameId } from 'utils/misc';
// import { useLocalStorage } from 'useLocalStorage';

// const initialGameData = {
//   gameId: 0,
//   guessHistory: [],
//   lastGuess: null,
//   foundWord: '',
//   numberOfTips: 0,
//   numberOfAttempts: 0,
//   gaveUp: '',
//   postGameHistory: [],
// };

// const initialState = {
//   lastGameId: 0,
//   openGameId: 0,
//   gameData: {
//     pt: {},
//     en: {},
//     es: {},
//   },
//   theme: undefined,
//   language: undefined,
//   version: 2,
// };

// const convertPreviousVersion = (previousState) => {
//   const newState = { ...initialState };

//   const { gameId } = previousState;
//   newState.lastGameId = gameId;
//   newState.openGameId = gameId;
//   newState.gameData.pt = { ...previousState.gameData };

//   return newState;
// };

// const selectMostRecentGame = (previousState, language) => {
//   let newState = { ...previousState };

//   const todaysGameId = getTodaysGameId(language);
//   const { lastGameId } = newState;

//   if (todaysGameId !== lastGameId) {
//     newState = {
//       ...newState,
//       lastGameId: todaysGameId,
//       openGameId: todaysGameId,
//     };
//   }

//   if (
//     newState.gameData[language] === undefined ||
//     newState.gameData[language][todaysGameId] === undefined
//   ) {
//     newState = {
//       ...newState,
//       gameData: {
//         ...newState.gameData,
//         [language]: {
//           ...newState.gameData[language],
//           [todaysGameId]: {
//             ...initialGameData,
//             gameId: todaysGameId,
//             // ...getTestGameData(),
//           },
//         },
//       },
//     };
//   }
//   return newState;
// };

// function useGameState() {
//   const [loading, setLoading] = useState(true);
//   const [savedState, setSavedState] = useLocalStorage('state', initialState);
//   const { language } = useParams();

//   useEffect(() => {
//     const { version: latestVersion } = initialState;
//     const { version: currentVersion } = savedState;

//     let latestVersionState = { ...savedState };

//     if (currentVersion < latestVersion - 1 || currentVersion > latestVersion) {
//       // Reset state to a clean initial version
//       latestVersionState = { ...initialState };
//     } else if (currentVersion === latestVersion - 1) {
//       latestVersionState = convertPreviousVersion(savedState);
//     }

//     latestVersionState = selectMostRecentGame(latestVersionState, language);

//     setSavedState(latestVersionState);
//     setLoading(false);
//   }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

//   return {
//     loading,
//     gameState: savedState,
//     setGameState: setSavedState,
//   };
// }

// export { useGameState };
