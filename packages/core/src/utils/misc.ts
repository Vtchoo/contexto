import dayjs from 'dayjs';

const cleanInput = (value: string) => value.toLowerCase().trim();

const PT_START_DATE = '2022-02-23';
const EN_START_DATE = '2022-09-18';
const ES_START_DATE = '2023-05-26';

const GREEN_THRESHOLD = 300;
const YELLOW_THRESHOLD = 1500;

type GuessHistoryItem = [string, number]; // [word, distance]

const randomTipDistance = (guessHistory: GuessHistoryItem[]) => {
	const maxDistance = GREEN_THRESHOLD - 1;
	let tipDistance = Math.floor(Math.random() * maxDistance - 1) + 1;

	if (guessHistory.length > 0) {
		const distances = guessHistory.map((guess: GuessHistoryItem) => guess[1]);
		while (distances.includes(tipDistance)) {
			tipDistance = Math.floor(Math.random() * maxDistance - 1) + 1;
		}
	}
	return tipDistance;
};

const nextTipDistance = (guessHistory: GuessHistoryItem[]) => {
	let tipDistance = GREEN_THRESHOLD - 1;
	let lowestDistance = tipDistance;

	if (guessHistory.length > 0) {
		const distances = guessHistory.map((guess: GuessHistoryItem) => guess[1]);
		lowestDistance = Math.min(...distances, lowestDistance);
		if (lowestDistance > 1) {
			tipDistance = lowestDistance - 1;
		} else {
			tipDistance = 2;
			while (distances.includes(tipDistance)) {
				tipDistance += 1;
			}
		}
	}

	return tipDistance;
};

const halfTipDistance = (guessHistory: GuessHistoryItem[]) => {
	let tipDistance = GREEN_THRESHOLD - 1;
	let lowestDistance = 2 * tipDistance;

	if (guessHistory.length > 0) {
		const distances = guessHistory.map((guess: GuessHistoryItem) => guess[1]);
		lowestDistance = Math.min(...distances, lowestDistance);
		if (lowestDistance > 1) {
			tipDistance = Math.floor(lowestDistance / 2);
		} else {
			tipDistance = 2;
			while (distances.includes(tipDistance)) {
				tipDistance += 1;
			}
		}
	}

	return tipDistance;
};

const getInitialTime = (language?: string) => {
	let initialTime = dayjs(PT_START_DATE, 'YYYY-MM-DD').startOf('day');
	if (language === 'en') {
		initialTime = dayjs(EN_START_DATE, 'YYYY-MM-DD').startOf('day');
	}
	if (language === 'es') {
		initialTime = dayjs(ES_START_DATE, 'YYYY-MM-DD').startOf('day');
	}
	return initialTime;
};

const getCurrentTime = () => {
	if (process.env.NODE_ENV === 'production') {
		return dayjs();
	}
	return dayjs();
};

const getTodaysGameId = (language?: string) => {
	const initialTime = getInitialTime(language);
	const currentTime = getCurrentTime().startOf('day');
	return currentTime.diff(initialTime, 'day');
};

const getBarWidth = (distance: number) => {
    const total = 40000
    const lambda = 0.5
    const pdf = (x: number) => lambda * Math.exp(-lambda * x)
    const startX = 0
    const endX = 100
    const startY = pdf(startX)
    const endY = pdf(endX)
    const x = (distance / total) * (endX - startX)
    let result = ((pdf(x) - endY) / (startY - endY)) * 100
    if (result < 1) {
        result = 1
    }
    // return `${result}%`
    return result
}

const getBarColor = (distance: number) => {
    if (distance < GREEN_THRESHOLD) {
        return 'green' // 'var(--green)'
    }
    if (distance < YELLOW_THRESHOLD) {
        return 'yellow' // 'var(--yellow)'
    }
    return 'red' // 'var(--red)'
}

export {
	cleanInput,
	GREEN_THRESHOLD,
	YELLOW_THRESHOLD,
	randomTipDistance,
	nextTipDistance,
	halfTipDistance,
	getInitialTime,
	getCurrentTime,
	getTodaysGameId,
	getBarWidth,
	getBarColor,
};
