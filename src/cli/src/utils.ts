// Game utilities - same logic as web client
const GREEN_THRESHOLD = 300;
const YELLOW_THRESHOLD = 1500;

export const getBarWidth = (distance: number): number => {
    const total = 40000;
    const lambda = 0.5;
    const pdf = (x: number) => lambda * Math.exp(-lambda * x);
    const startX = 0;
    const endX = 100;
    const startY = pdf(startX);
    const endY = pdf(endX);
    const x = (distance / total) * (endX - startX);
    let result = ((pdf(x) - endY) / (startY - endY)) * 100;
    if (result < 1) {
        result = 1;
    }
    return result;
};

export const getBarColor = (distance: number): 'green' | 'yellow' | 'red' => {
    if (distance < GREEN_THRESHOLD) {
        return 'green';
    }
    if (distance < YELLOW_THRESHOLD) {
        return 'yellow';
    }
    return 'red';
};

export const cleanInput = (value: string): string => value.trim();

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export { GREEN_THRESHOLD, YELLOW_THRESHOLD };
