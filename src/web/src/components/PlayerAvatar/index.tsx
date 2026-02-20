import * as Styled from './styles';
import { NumberBadge, MedalBadge, CompletionBadge } from '../PlayerBadges';

interface PlayerAvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
    username?: string;
    avatarUrl?: string;
    id: string;
    size?: number;
    transparent?: boolean;
    numberBadge?: number;
    medalPosition?: 1 | 2 | 3;
    onClick?: (event: React.MouseEvent, position: { x: number; y: number }) => void;
    closestDistance?: number;
    totalGuesses?: number;
}

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

const PlayerAvatar = ({ avatarUrl, username, id, size = 40, transparent, numberBadge, medalPosition, onClick, closestDistance, totalGuesses, ...props }: PlayerAvatarProps) => {
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
        <Styled.AvatarContainer {...props}>
            <Styled.Avatar
                size={size}
                title={username || id}
                transparent={transparent}
                clickable={!!onClick}
                onClick={handleClick}
            >
                {avatarUrl ? <Styled.AvatarImage src={avatarUrl} alt={username || id} /> : initials}
            </Styled.Avatar>
            {numberBadge !== undefined && numberBadge > 0 && (
                <NumberBadge number={numberBadge} size={Math.max(16, size * 0.4)} />
            )}
            {!!medalPosition && (
                <MedalBadge position={medalPosition} size={Math.max(20, size * 0.5)} />
            )}
            {(!medalPosition && completed) && (
                <CompletionBadge size={Math.max(20, size * 0.5)} />
            )}
        </Styled.AvatarContainer>
    );
};

export default PlayerAvatar;
