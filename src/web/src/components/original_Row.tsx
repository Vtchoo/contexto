import { useGame } from '@/contexts/GameContext';
import { GREEN_THRESHOLD, YELLOW_THRESHOLD } from '../../../utils/misc';
import { PlayerAvatar } from './PlayerAvatar';
import { useTheme } from '../contexts/ThemeContext';

const getBarWidth = (distance: number) => {
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
	return `${result}%`;
};

const getBarColor = (distance: number, customColor?: string | null) => {
	// Use custom color if provided
	if (customColor) {
		return customColor;
	}
	
	// Fall back to default CSS variables
	if (distance < GREEN_THRESHOLD) {
		return 'var(--green)';
	}
	if (distance < YELLOW_THRESHOLD) {
		return 'var(--yellow)';
	}
	return 'var(--red)';
};

interface RowProps {
	word: string;
	distance: number;
	highlight?: boolean;
	hidden?: boolean;
	addedBy?: string;
	playerId?: string; // Optional, used for multiplayer to show the player who added the guess
	highlightPlayerGuess?: boolean;
}

function Row({ word, distance, highlight, hidden, addedBy, playerId, highlightPlayerGuess }: RowProps) {

	const { getPlayerById } = useGame()
	const { getThemeStyles, getDistanceColor } = useTheme()

	const displayWord = (hidden && addedBy) ? `@${getPlayerById(addedBy)?.username || addedBy}` : word;
	// console.log({ word, distance, highlight, hidden, addedBy });
	return (
		<div 
			className={`row-wrapper ${highlight ? 'current' : ''}`} 
			key={word}
			style={getThemeStyles('rowWrapper')}
		>
			<div 
				className="outer-bar"
				style={getThemeStyles('outerBar')}
			>
				<div
					className="inner-bar"
					style={{
						width: getBarWidth(distance),
						backgroundColor: (addedBy !== playerId && highlightPlayerGuess) ? 'var(--avatar-bg-color)' : getBarColor(distance, getDistanceColor(distance)),
						...getThemeStyles('innerBar')
					}}
				/>
			</div>
			<div 
				className="row"
				style={getThemeStyles('row')}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', ...getThemeStyles('word') }}>
					{displayWord}
					{addedBy && !hidden && (addedBy !== playerId) && (
						<PlayerAvatar 
							id={addedBy} 
							username={getPlayerById(addedBy)?.username} 
							size={24} 
							transparent 
						/>
					)}
				</div>
				<span style={getThemeStyles('distance')}>{distance + 1}</span>
			</div>
		</div>
	);
}

export default Row;
