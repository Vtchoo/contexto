import React, { useState, useRef, useCallback } from 'react';
import { userApi } from '../../api/gameApi';
import { useGame } from '../../contexts/GameContext';
import {
  AvatarUploadContainer,
  AvatarPreview,
  AvatarImage,
  PlaceholderText,
  HiddenFileInput,
  ButtonGroup,
  Button,
  ErrorMessage,
  SuccessMessage,
  FileInfo,
  LoadingSpinner,
} from './styles';

interface AvatarUploadProps {
  onUploadComplete?: (avatarUrl: string) => void;
  onDeleteComplete?: () => void;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  onUploadComplete,
  onDeleteComplete,
}) => {
  const { user, refreshUser } = useGame();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Clear messages after a few seconds
  const clearMessages = useCallback(() => {
    setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);
  }, []);

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, or WebP)';
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'File is too large. Maximum size is 5MB.';
    }

    return null;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setPreviewUrl('');
      clearMessages();
      return;
    }

    setSelectedFile(file);
    setError('');
    setSuccess('');

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const result = await userApi.uploadAvatar(selectedFile);
      setSuccess('Avatar salvo com sucesso!');
      setSelectedFile(null);
      setPreviewUrl('');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh user data to get updated avatar
      if (refreshUser) {
        await refreshUser();
      }

      // Call callback if provided
      if (onUploadComplete) {
        onUploadComplete(result.avatarUrl);
      }

      clearMessages();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setError(error.response?.data?.error || 'Falha ao enviar o avatar. Por favor, tente novamente.');
      clearMessages();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.avatarUrl) return;

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      await userApi.deleteAvatar();
      setSuccess('Avatar excluído com sucesso!');
      
      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }

      // Call callback if provided
      if (onDeleteComplete) {
        onDeleteComplete();
      }

      clearMessages();
    } catch (error: any) {
      console.error('Avatar deletion error:', error);
      setError(error.response?.data?.error || 'Falha ao excluir o avatar. Por favor, tente novamente.');
      clearMessages();
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setError('');
    setSuccess('');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const currentAvatarUrl = user?.avatarUrl;
  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <AvatarUploadContainer>
      <AvatarPreview hasImage={!!displayUrl} onClick={openFileDialog}>
        {displayUrl ? (
          <AvatarImage src={displayUrl} alt="Avatar preview" />
        ) : (
          <PlaceholderText>
            Clique para selecionar<br />seu avatar
          </PlaceholderText>
        )}
      </AvatarPreview>

      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {selectedFile && (
        <FileInfo>
          Selecionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
        </FileInfo>
      )}

      <ButtonGroup>
        {!selectedFile ? (
          <>
            <Button variant="secondary" onClick={openFileDialog}>
              Escolher Arquivo
            </Button>
            {currentAvatarUrl && (
              <Button 
                variant="danger" 
                onClick={handleDelete}
                disabled={isUploading}
              >
                {isUploading ? <LoadingSpinner /> : 'Excluir Avatar'}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button 
              variant="primary" 
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? <LoadingSpinner /> : 'Salvar'}
            </Button>
            <Button 
              variant="secondary" 
              onClick={handleCancel}
              disabled={isUploading}
            >
              Cancelar
            </Button>
          </>
        )}
      </ButtonGroup>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}
    </AvatarUploadContainer>
  );
};

export default AvatarUpload;