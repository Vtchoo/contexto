// Browser-safe utilities - no external dependencies
export const GREEN_THRESHOLD = 300;
export const YELLOW_THRESHOLD = 1500;

export const getTodaysGameId = (): number => {
    const startDate = new Date('2022-02-23');
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

export const getBarWidth = (distance: number): number => {
	if (distance <= GREEN_THRESHOLD) {
		return Math.max(25, 100 * (GREEN_THRESHOLD - distance) / GREEN_THRESHOLD);
	} else if (distance <= YELLOW_THRESHOLD) {
		return Math.max(5, 25 * (YELLOW_THRESHOLD - distance) / (YELLOW_THRESHOLD - GREEN_THRESHOLD));
	} else {
		return 5;
	}
};

export const getBarColor = (distance: number): string => {
	if (distance <= GREEN_THRESHOLD) {
		const intensity = Math.max(0.3, (GREEN_THRESHOLD - distance) / GREEN_THRESHOLD);
		const red = Math.floor(0 + (255 - 0) * (1 - intensity));
		const green = Math.floor(128 + (255 - 128) * intensity);
		const blue = Math.floor(0 + (100 - 0) * (1 - intensity));
		return `rgb(${red}, ${green}, ${blue})`;
	} else if (distance <= YELLOW_THRESHOLD) {
		const intensity = Math.max(0.3, (YELLOW_THRESHOLD - distance) / (YELLOW_THRESHOLD - GREEN_THRESHOLD));
		const red = Math.floor(200 + (255 - 200) * intensity);
		const green = Math.floor(150 + (200 - 150) * intensity);
		const blue = Math.floor(0 + (50 - 0) * intensity);
		return `rgb(${red}, ${green}, ${blue})`;
	} else {
		return 'rgb(150, 150, 150)';
	}
};
