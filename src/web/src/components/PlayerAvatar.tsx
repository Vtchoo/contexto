import styled from 'styled-components';

interface PlayerAvatarProps {
  username?: string;
  id: string;
  size?: number;
}

const Avatar = styled.div<{ size: number }>`
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

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ username, id, size = 40 }) => {
  const initials = getInitials(username, id);
  return <Avatar size={size} title={username || id}>{initials}</Avatar>;
};
