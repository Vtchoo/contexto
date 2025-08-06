import styled, { css } from 'styled-components';
import { NumberBadge, MedalBadge, CompletionBadge } from './PlayerBadges';

interface PlayerAvatarProps {
    username?: string;
    id: string;
    size?: number;
    transparent?: boolean;
    numberBadge?: number;
    medalPosition?: 1 | 2 | 3;
    onClick?: (event: React.MouseEvent, position: { x: number; y: number }) => void;
    closestDistance?: number;
    totalGuesses?: number;
}

const AvatarContainer = styled.div`
    position: relative;
    display: inline-block;
`;

const Avatar = styled.div<{ size: number; transparent?: boolean; clickable?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    background: #4a90e2;
    color: #fff;
    font-weight: bold;
    font-size: ${({ size }) => size * 0.45}px;
    border-radius: 50%;
    width: ${({ size }) => size}px;
    height: ${({ size }) => size}px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    user-select: none;
    cursor: ${({ clickable }) => clickable ? 'pointer' : 'default'};

    
    ${({ transparent }) => transparent && css`
        transition: filter 0.2s ease-in-out;
        filter: opacity(0.5);
        &:hover {
            filter: opacity(1);
        }
    `};

    ${({ clickable }) => clickable && css`
        transition: transform 0.2s ease-in-out;
        &:hover {
            transform: scale(1.1);
        }
    `};
`;

function getInitials(username?: string, id?: string) {
    if (username && username.trim()) {
        const parts = username.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (id) {
        return id.slice(-2);
    }
    return '--';
}

export const PlayerAvatar = ({ username, id, size = 40, transparent, numberBadge, medalPosition, onClick, closestDistance, totalGuesses }: PlayerAvatarProps) => {
    const initials = getInitials(username, id);
    
    const handleClick = (event: React.MouseEvent) => {
        if (onClick) {
            const rect = event.currentTarget.getBoundingClientRect();
            const position = {
                x: rect.left + rect.width / 2,
                y: rect.top
            };
            onClick(event, position);
        }
    };

    const completed = totalGuesses !== undefined && closestDistance !== undefined && totalGuesses > 0 && closestDistance === 0;

    return (
        <AvatarContainer>
            <Avatar
                size={size}
                title={username || id}
                transparent={transparent}
                clickable={!!onClick}
                onClick={handleClick}
            >
                {initials}
            </Avatar>
            {numberBadge !== undefined && numberBadge > 0 && (
                <NumberBadge number={numberBadge} size={Math.max(16, size * 0.4)} />
            )}
            {!!medalPosition && (
                <MedalBadge position={medalPosition} size={Math.max(20, size * 0.5)} />
            )}
            {(!medalPosition && completed) && (
                <CompletionBadge size={Math.max(20, size * 0.5)} />
            )}
        </AvatarContainer>
    );
};
