import styled, { css } from 'styled-components';


export const AvatarContainer = styled.div`
    position: relative;
    display: inline-block;
`;

export const Avatar = styled.div<{ size: number; transparent?: boolean; clickable?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--avatar-bg-color);
    color: #fff;
    font-weight: bold;
    font-size: ${({ size }) => size * 0.45}px;
    border-radius: 50%;
    width: ${({ size }) => size}px;
    height: ${({ size }) => size}px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    user-select: none;
    cursor: ${({ clickable }) => clickable ? 'pointer' : 'default'};

    overflow: hidden;

    
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

export const AvatarImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;
