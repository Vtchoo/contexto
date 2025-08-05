import styled, { css } from 'styled-components';
import { NumberBadge, MedalBadge } from './PlayerBadges';

interface PlayerAvatarProps {
    username?: string;
    id: string;
    size?: number;
    transparent?: boolean;
    numberBadge?: number;
    medalPosition?: 1 | 2 | 3;
}

const AvatarContainer = styled.div`
    position: relative;
    display: inline-block;
`;

const Avatar = styled.div<{ size: number; transparent?: boolean }>`
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

    
    ${({ transparent }) => transparent && css`
        transition: filter 0.2s ease-in-out;
        filter: opacity(0.5);
        &:hover {
            filter: opacity(1);
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

export const PlayerAvatar = ({ username, id, size = 40, transparent, numberBadge, medalPosition }: PlayerAvatarProps) => {
    const initials = getInitials(username, id);
    return (
        <AvatarContainer>
            <Avatar
                size={size}
                title={username || id}
                transparent={transparent}
            >
                {initials}
            </Avatar>
            {numberBadge !== undefined && numberBadge > 0 && (
                <NumberBadge number={numberBadge} size={Math.max(16, size * 0.4)} />
            )}
            {!!medalPosition && (
                <MedalBadge position={medalPosition} size={Math.max(20, size * 0.5)} />
            )}
        </AvatarContainer>
    );
};
