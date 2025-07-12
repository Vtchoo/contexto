import { GREEN_THRESHOLD, YELLOW_THRESHOLD } from '../../../utils/misc';

const getBarWidth = (distance) => {
	const total = 40000;
	const lambda = 0.5;
	const pdf = (x) => lambda * Math.exp(-lambda * x);
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

const getBarColor = (distance) => {
	if (distance < GREEN_THRESHOLD) {
		return 'var(--green)';
	}
	if (distance < YELLOW_THRESHOLD) {
		return 'var(--yellow)';
	}
	return 'var(--red)';
};

function Row({ word, distance, highlight }) {
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
				<span>{word}</span>
				<span>{distance + 1}</span>
			</div>
		</div>
	);
}

export default Row;
