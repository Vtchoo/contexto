// import '../App.css';

// import React, { useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';
// import { useTranslation } from 'react-i18next';
// import 'dayjs/locale/pt';
// import 'dayjs/locale/es';
// import dayjs from 'dayjs';
// import utc from 'dayjs/plugin/utc';
// import { useGameState } from 'useGameState';
// import { Icons } from 'components/Icons';
// import { Menu } from 'components/Menu';
// import { End } from 'components/End';
// import { Loading } from 'components/Loading';
// import { Row } from 'components/Row';
// import { WordList } from 'components/WordList';
// import { Instructions } from 'components/modals/Instructions';
// import { FAQ } from 'components/modals/FAQ';
// import Footer from 'components/Footer';
// import { track } from 'utils/analytics';
// import { displayGameId } from 'utils/display';
// import {
//     cleanInput,
//     halfTipDistance,
//     nextTipDistance,
//     randomTipDistance,
// } from 'utils/misc';
// import 'i18n';
// import GameApi from 'gameApi';
// import DailyAnnouncement from 'components/DailyAnnouncement';
// import OtherGames from 'shared/OtherGames';
// import TopBanner from 'components/TopBanner';
// import ModalSelector from 'components/ModalSelector';
// import { useModal } from 'common/hooks';

// dayjs.extend(utc);

// const initialGameData = {
//     gameId: 0,
//     guessHistory: [],
//     lastGuess: null,
//     foundWord: '',
//     numberOfTips: 0,
//     numberOfAttempts: 0,
//     gaveUp: '',
//     postGameHistory: [],
// };

// const initialPrevious = { loading: false, data: [] };

// const defaultDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// function App() {
//     const {
//         loading: loadingGame,
//         gameState: state,
//         setGameState: setState,
//     } = useGameState();
//     const [word, setWord] = useState('');
//     const [messageType, setMessageType] = useState('');
//     const [errorMsg, setErrorMsg] = useState('');
//     const [loading, setLoading] = useState(false);
//     const modal = useModal();
//     const [current, setCurrent] = useState({});
//     const [order, setOrder] = useState('similarity');
//     const [isRandom, setIsRandom] = useState(false);
//     const { t } = useTranslation();
//     const { language } = useParams();

//     useEffect(() => {
//         const { theme } = state;

//         if ((theme === undefined && defaultDark) || theme === 'dark') {
//             document.documentElement.setAttribute('data-theme', 'dark');
//         }
//     }, []); // eslint-disable-line react-hooks/exhaustive-deps

//     const setTipSetting = (newTipSetting) => {
//         setState({ ...state, tipSetting: newTipSetting });
//         track.tipSetting(newTipSetting);
//     };

//     const setTheme = (theme) => {
//         setState({ ...state, theme });
//         document.documentElement.setAttribute('data-theme', theme);
//         track.themeSetting(theme);
//     };

//     if (loadingGame) {
//         return <div />;
//     }

//     if (language === undefined) {
//         return <div />;
//     }

//     const {
//         gameData,
//         openGameId,
//         lastGameId,
//         theme = defaultDark ? 'dark' : 'light',
//         tipSetting = 'half',
//     } = state;

//     if (!gameData) return <div />;

//     const openGameData = gameData[language][openGameId];
//     if (!openGameData) return <div />;

//     const languageUrl = language === 'pt' ? 'pt-br' : language;

//     const {
//         gameId,
//         guessHistory,
//         lastGuess,
//         foundWord,
//         numberOfTips,
//         numberOfAttempts,
//         gaveUp,
//         postGameHistory,
//     } = openGameData;

//     const gameApi = GameApi(languageUrl, gameId);

//     const setOpenGameData = (openGameDataParam) => {
//         setState({
//             ...state,
//             gameData: {
//                 ...state.gameData,
//                 [language]: {
//                     ...state.gameData[language],
//                     [state.openGameId]: {
//                         ...state.gameData[language][state.openGameId],
//                         ...openGameDataParam,
//                     },
//                 },
//             },
//         });
//     };

//     const isPostGame = foundWord || gaveUp;

//     const getDistance = async (wordParam) => {
//         let lemma = '';
//         let distance = -2;
//         let error = '';

//         try {
//             const response = await gameApi.play(wordParam);
//             ({ lemma, distance, error } = await response.json());
//         } catch (e) {
//             error = t('oops');
//         }

//         return { lemma, distance, error };
//     };

//     const getExistent = (wordParam) => {
//         let result = guessHistory.find((item) => item[0] === wordParam);
//         if (!result) {
//             result = postGameHistory.find((item) => item[0] === wordParam);
//         }
//         return result;
//     };

//     function containsWhitespace(str) {
//         return /\s/.test(str);
//     }

//     const guessWord = async ({ tip = '', tipDistance } = {}) => {
//         let lowerCaseWord = cleanInput(word);

//         if (tip) {
//             lowerCaseWord = tip.toLowerCase().trim();
//         }

//         if (lowerCaseWord === '') return;

//         const hasWhiteSpace = containsWhitespace(lowerCaseWord);

//         if (hasWhiteSpace === true) {
//             setMessageType('error');
//             setErrorMsg(t('onlyOneWord'));

//             return;
//         }

//         let lemma;
//         let distance;
//         let error;

//         if (!tipDistance) {
//             ({ lemma, distance, error } = await getDistance(lowerCaseWord));
//         } else {
//             lemma = tip;
//             distance = tipDistance;
//             error = '';
//         }

//         if (error || distance < 0) {
//             setMessageType('error');
//             setErrorMsg(error);
//             return;
//         }

//         const existent = getExistent(lemma);

//         if (existent) {
//             setOpenGameData({
//                 lastGuess: existent,
//             });
//             setMessageType('repeated');
//             setWord('');
//             return;
//         }

//         const newLastGuess = [lemma, distance];

//         let newFoundWord = foundWord;

//         if (distance === 0 && !gaveUp) {
//             newFoundWord = lemma;
//         }

//         let newGuessHistory = guessHistory;
//         let newPostGameHistory = postGameHistory;

//         if (isPostGame) {
//             newPostGameHistory = [...postGameHistory, newLastGuess];
//         } else {
//             newGuessHistory = [...guessHistory, newLastGuess];
//         }

//         setOpenGameData({
//             guessHistory: newGuessHistory,
//             postGameHistory: newPostGameHistory,
//             lastGuess: newLastGuess,
//             foundWord: newFoundWord,
//             numberOfTips: tip ? numberOfTips + 1 : numberOfTips,
//             numberOfAttempts:
//                 tip || foundWord || gaveUp ? numberOfAttempts : numberOfAttempts + 1,
//         });

//         setMessageType('');
//         setWord('');

//         if (newFoundWord || gaveUp) {
//             setIsRandom(false);
//         }

//         if (guessHistory.length === 0) track.start(language);

//         if (tip !== '') {
//             track.tip(language);
//         } else if (distance === 0) {
//             track.win(language);
//         } else if (foundWord === '') {
//             track.guess(language);
//         } else {
//             track.guessAfterWin(language);
//         }
//     };

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (loading) return;
//         setLoading(true);
//         await guessWord();
//         setLoading(false);
//     };

//     const handleWordChange = (e) => {
//         if (loading) return;
//         setWord(e.target.value);
//     };

//     const getTip = async () => {
//         let tipDistance;

//         if (tipSetting === 'random') {
//             tipDistance = randomTipDistance(guessHistory);
//         } else if (tipSetting === 'next') {
//             tipDistance = nextTipDistance(guessHistory);
//         } else {
//             tipDistance = halfTipDistance(guessHistory);
//         }

//         const response = await gameApi.tip(tipDistance);
//         const { lemma, distance } = await response.json();
//         return { lemma, distance };
//     };

//     const getResult = async () => {
//         const response = await gameApi.giveUp();
//         const { lemma } = await response.json();
//         return lemma;
//     };

//     const handleTip = async () => {
//         setLoading(true);
//         let { lemma, distance } = await getTip();
//         const repeated = () =>
//             guessHistory.findIndex((item) => item[0] === lemma) !== -1;
//         let attempts = 0;
//         while (repeated() && attempts < 10) {
//             // eslint-disable-next-line no-await-in-loop
//             ({ lemma, distance } = await getTip());
//             attempts += 1;
//         }
//         if (!repeated()) {
//             await guessWord({ tip: lemma, tipDistance: distance });
//         }
//         setLoading(false);
//     };

//     const handleGiveUp = async () => {
//         modal.close();
//         setLoading(true);
//         const result = await getResult();
//         setOpenGameData({
//             gaveUp: result,
//             lastGuess: [result, 0],
//             postGameHistory: [[result, 0]],
//         });
//         track.giveUp(language);
//         setLoading(false);
//     };

//     const loadCurrent = async () => {
//         const { loading: gameLoading, data } =
//             current[openGameId] || initialPrevious;

//         modal.open('current');

//         if (gameLoading || data.length > 0) return;

//         setCurrent({ ...current, [openGameId]: { loading: true, data: [] } });

//         const response = await gameApi.getClosestWords();
//         const { words } = await response.json();

//         setCurrent({ ...current, [openGameId]: { loading: false, data: words } });
//         track.viewTopWords(language);
//     };

//     const onSelectGame = (newGameId, random = false) => {
//         const newGameData = { ...gameData, [language]: { ...gameData[language] } };
//         if (newGameData[language][newGameId] === undefined) {
//             newGameData[language][newGameId] = {
//                 ...initialGameData,
//                 gameId: newGameId,
//             };
//         }
//         newGameData[language][newGameId].lastGuess = null;
//         setState({
//             ...state,
//             openGameId: newGameId,
//             gameData: newGameData,
//         });
//         setWord('');
//         setMessageType('');
//         modal.close();
//         setIsRandom(random);
//         if (window.init) {
//             window.init();
//         }
//         if (random) {
//             track.selectRandomGame(language);
//         } else {
//             track.selectPreviousGame(language);
//         }
//     };

//     let message = null;

//     if (loading) {
//         message = (
//             <div className="message">
//                 <div className="message-text">
//                     <Loading text={t('calculating')} />
//                 </div>
//             </div>
//         );
//     } else if (messageType === 'repeated') {
//         message = (
//             <div className="message">
//                 <div className="message-text">
//                     {t('theWord')} <b>{lastGuess[0]}</b> {t('alreadyGuessed')}.
//                 </div>
//             </div>
//         );
//     } else if (messageType === 'error') {
//         message = (
//             <div className="message">
//                 <div className="message-text">{errorMsg}</div>
//             </div>
//         );
//     } else if (lastGuess !== null) {
//         message = (
//             <div className="message">
//                 <div>
//                     <Row word={lastGuess[0]} distance={lastGuess[1]} highlight />
//                 </div>
//             </div>
//         );
//     }

//     let instructions = null;

//     const openFAQ = () => {
//         modal.open('faq');
//         track.faq(language);
//     };

//     if (
//         openGameId === lastGameId &&
//         message === null &&
//         !isPostGame &&
//         guessHistory.length === 0
//     ) {
//         instructions = (
//             <>
//                 <div className="how-to-play">
//                     <Instructions />
//                 </div>
//                 <div className="faq-card">
//                     <FAQ limit={2} />
//                 </div>
//                 <div className="faq-read-more">
//                     <button
//                         type="button"
//                         className="button small subtle"
//                         onClick={openFAQ}
//                     >
//                         {t('faq.more')}...
//                     </button>
//                 </div>
//                 <Footer />
//             </>
//         );
//     }

//     const highlights = lastGuess ? [lastGuess[0]] : [];
//     const allWords = guessHistory.concat(postGameHistory || []);

//     return (
//         <div className="wrapper top-ad-padding">
//             <main>
//                 <TopBanner language={language} />
//                 <div className="top-bar">
//                     <div className="title">
//                         <h1>Contexto</h1>
//                     </div>
//                     <Menu>
//                         <button
//                             type="button"
//                             className="menu-item"
//                             onClick={() => {
//                                 modal.open('instructions');
//                                 track.instructions(language);
//                             }}
//                         >
//                             <Icons.QuestionMark />
//                             {t('How to play')}
//                         </button>
//                         <button
//                             type="button"
//                             className="menu-item"
//                             disabled={!!foundWord || !!gaveUp}
//                             onClick={handleTip}
//                         >
//                             <Icons.LightBulb />
//                             {t('Tip')}
//                         </button>
//                         <button
//                             type="button"
//                             className="menu-item"
//                             disabled={!!foundWord || !!gaveUp}
//                             onClick={() => modal.open('giveUp')}
//                         >
//                             <Icons.GiveUp />
//                             {t('Give up')}
//                         </button>
//                         <button
//                             type="button"
//                             className="menu-item"
//                             onClick={() => modal.open('previous')}
//                         >
//                             <Icons.Calendar />
//                             {t('Previous games')}
//                         </button>
//                         <button
//                             type="button"
//                             className="menu-item"
//                             onClick={() => {
//                                 modal.open('settings');
//                                 track.settings(language);
//                             }}
//                         >
//                             <Icons.Settings />
//                             {t('Settings')}
//                         </button>
//                         <button
//                             type="button"
//                             className="menu-item"
//                             onClick={() => {
//                                 modal.open('info');
//                                 track.credits(language);
//                             }}
//                         >
//                             <Icons.Info />
//                             {t('Credits')}
//                         </button>
//                         <button
//                             type="button"
//                             className="menu-item"
//                             onClick={() => {
//                                 modal.open('feedback');
//                             }}
//                         >
//                             <Icons.Chat />
//                             {t('Feedback')}
//                         </button>
//                         <button type="button" className="menu-item" onClick={openFAQ}>
//                             <Icons.FAQ />
//                             {t('faq.title')}
//                         </button>
//                     </Menu>
//                 </div>
//                 {isPostGame && (
//                     <>
//                         <End
//                             state={openGameData}
//                             language={language}
//                             onPlayAgain={() => {
//                                 track.playAgainClick(language);
//                                 modal.open('previous');
//                             }}
//                         />
//                         <DailyAnnouncement />
//                         <OtherGames />
//                     </>
//                 )}
//                 {isPostGame && (
//                     <div style={{ textAlign: 'center', margin: '30px 0 20px 0' }}>
//                         <button
//                             type="button"
//                             className="button"
//                             onClick={() => loadCurrent()}
//                         >
//                             <Icons.Eye />
//                             {t('Closest words')}
//                         </button>
//                     </div>
//                 )}
//                 <div className="info-bar">
//                     <span className="label">{t('game')}:</span>{' '}
//                     <span>{isRandom ? t('random') : `#${displayGameId(gameId)}`}</span>
//                     &nbsp;&nbsp;
//                     <span className="label">{t('attempts')}:</span>{' '}
//                     <span>{numberOfAttempts}</span>&nbsp;&nbsp;
//                     {numberOfTips > 0 && (
//                         <>
//                             <span className="label">{t('tips')}:</span>{' '}
//                             <span>{numberOfTips}</span>
//                         </>
//                     )}
//                 </div>
//                 <form onSubmit={handleSubmit}>
//                     <input
//                         className="word"
//                         type="text"
//                         name="word"
//                         value={word}
//                         onChange={handleWordChange}
//                         placeholder={t('inputPlaceholder')}
//                         autoCapitalize="off"
//                         autoComplete="off"
//                         enterKeyHint="send"
//                     />
//                 </form>
//                 {message}
//                 {instructions}
//                 <WordList words={allWords} highlights={highlights} order={order} />
//             </main>
//             <ModalSelector
//                 lastGameId={lastGameId}
//                 onSelectGame={onSelectGame}
//                 gameData={gameData}
//                 handleGiveUp={handleGiveUp}
//                 tipSetting={tipSetting}
//                 theme={theme}
//                 setTheme={setTheme}
//                 setTipSetting={setTipSetting}
//                 order={order}
//                 setOrder={setOrder}
//                 openGameId={openGameId}
//                 current={current}
//             />
//         </div>
//     );
// }

// export default App;
