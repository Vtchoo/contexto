import styled from 'styled-components';

interface NumberBadgeProps {
    number: number;
    size?: number;
}

interface MedalBadgeProps {
    position?: 1 | 2 | 3;
    size?: number;
}

const BadgeContainer = styled.div<{ size: number }>`
    position: absolute;
    bottom: -4px;
    right: -4px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: ${({ size }) => size}px;
    height: ${({ size }) => size}px;
    border-radius: ${({ size }) => size / 2}px;
    font-weight: bold;
    font-size: ${({ size }) => size * 0.6}px;
    border: 2px solid var(--card-bg, #fff);
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 10;
`;

const NumberBadgeStyled = styled(BadgeContainer)`
    background: #ff6b6b;
    color: #fff;
    padding: 0 ${({ size }) => Math.max(2, size * 0.1)}px;
    right: -4px;
`;

const MedalBadgeStyled = styled(BadgeContainer)<{ position?: 1 | 2 | 3 }>`
    background: transparent;
    border: none;
    box-shadow: none;
    left: -4px;
    right: auto;
    font-size: ${({ size }) => size * 0.8}px;
`;

export const NumberBadge = ({ number, size = 20 }: NumberBadgeProps) => {
    if (number <= 0) return null;
    
    return (
        <NumberBadgeStyled size={size}>
            {number > 99 ? '99+' : number}
        </NumberBadgeStyled>
    );
};

export const MedalBadge = ({ position, size = 24 }: MedalBadgeProps) => {
    let medalEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';

    return (
        <MedalBadgeStyled position={position} size={size}>
            {medalEmoji}
        </MedalBadgeStyled>
    );
};

interface CompletionBadgeProps {
    size?: number;
}

export const CompletionBadge = ({ size = 24 }: CompletionBadgeProps) => {
    return (
        <MedalBadgeStyled position={undefined} size={size}>
            🏁
        </MedalBadgeStyled>
    );
};
