import { useGame } from '@/contexts/GameContext';
import { GREEN_THRESHOLD, YELLOW_THRESHOLD } from '../../../utils/misc';
import { PlayerAvatar } from './PlayerAvatar';

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

const getBarColor = (distance: number) => {
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
}

function Row({ word, distance, highlight, hidden, addedBy, playerId }: RowProps) {

	const { getPlayerById } = useGame()

	const displayWord = (hidden && addedBy) ? `@${getPlayerById(addedBy)?.username}` : word;
	console.log({ word, distance, highlight, hidden, addedBy });
	return (
		<div className={`row-wrapper ${highlight ? 'current' : ''}`} key={word}>
			<div className="outer-bar">
				<div
					className="inner-bar"
					style={{
						width: getBarWidth(distance),
						backgroundColor: getBarColor(distance),
					}}
				/>
			</div>
			<div className="row">
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
					{displayWord}
					{addedBy && (addedBy !== playerId) && (
						<PlayerAvatar id={addedBy} username={getPlayerById(addedBy)?.username} size={24} transparent />
					)}
				</div>
				<span>{distance + 1}</span>
			</div>
		</div>
	);
}

export default Row;
