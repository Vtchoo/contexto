import styled from 'styled-components';

export const AvatarUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 2px 8px var(--shadow);
`;

export const AvatarPreview = styled.div<{ hasImage: boolean }>`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid var(--border-color);
  background: ${props => props.hasImage ? 'transparent' : 'var(--input-bg)'};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--button-bg);
  }
`;

export const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
`;

export const PlaceholderText = styled.div`
  color: var(--secondary-text);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem;
`;

export const HiddenFileInput = styled.input`
  display: none;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

export const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;

  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: var(--button-bg);
          color: var(--button-text);
          &:hover:not(:disabled) {
            background: var(--button-hover);
          }
        `;
      case 'danger':
        return `
          background: #dc3545;
          color: white;
          &:hover:not(:disabled) {
            background: #c82333;
          }
        `;
      default:
        return `
          background: var(--input-bg);
          color: var(--text-color);
          border: 1px solid var(--border-color);
          &:hover:not(:disabled) {
            background: var(--border-color);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const ErrorMessage = styled.div`
  color: #dc3545;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.5rem;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  margin-top: 0.5rem;
`;

export const SuccessMessage = styled.div`
  color: #155724;
  font-size: 0.9rem;
  text-align: center;
  padding: 0.5rem;
  background: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  margin-top: 0.5rem;
`;

export const FileInfo = styled.div`
  color: var(--secondary-text);
  font-size: 0.8rem;
  text-align: center;
  margin-top: 0.5rem;
`;

export const LoadingSpinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--button-bg);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;