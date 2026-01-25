import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal } from './Modal';
import { uploadService } from '../services/uploadService';

interface ImageCropperProps {
    /** Current image URL */
    value?: string;
    /** Callback when image is uploaded/changed */
    onChange: (url: string) => void;
    /** Max display dimension (px) - images larger will trigger crop */
    maxSize?: number;
    /** Aspect ratio for cropping (default: 1 for square) */
    aspectRatio?: number;
    /** Placeholder text */
    placeholder?: string;
    /** CSS classes for the container */
    className?: string;
    /** Whether component is disabled */
    disabled?: boolean;
}

// Helper to center crop with aspect ratio
function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number
): Crop {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    );
}

const ImageCropper: React.FC<ImageCropperProps> = ({
    value,
    onChange,
    maxSize = 400,
    aspectRatio = 1,
    placeholder = 'Click để chọn ảnh',
    className = '',
    disabled = false,
}) => {
    const [previewUrl, setPreviewUrl] = useState<string>(value || '');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [imgSrc, setImgSrc] = useState<string>('');
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string>('');

    const imgRef = useRef<HTMLImageElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const originalFileRef = useRef<File | null>(null);

    // Check if image needs cropping based on size
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh');
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File ảnh quá lớn (tối đa 5MB)');
            return;
        }

        originalFileRef.current = file;

        // Read file and check dimensions
        const reader = new FileReader();
        reader.onload = () => {
            const imgEl = new Image();
            imgEl.onload = () => {
                if (imgEl.width > maxSize || imgEl.height > maxSize) {
                    // Image is too large, show crop modal
                    setImgSrc(reader.result as string);
                    setIsModalOpen(true);
                } else {
                    // Image is small enough, upload directly
                    uploadFile(file);
                }
            };
            imgEl.src = reader.result as string;
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // When image loads in crop modal, set initial crop
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspectRatio));
    }, [aspectRatio]);

    // Crop image using canvas
    const getCroppedImage = useCallback(async (): Promise<Blob | null> => {
        const image = imgRef.current;
        const cropData = completedCrop;

        if (!image || !cropData) return null;

        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        // Set output size to maxSize
        const outputSize = Math.min(maxSize, Math.max(cropData.width * scaleX, cropData.height * scaleY));
        canvas.width = outputSize;
        canvas.height = outputSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
            image,
            cropData.x * scaleX,
            cropData.y * scaleY,
            cropData.width * scaleX,
            cropData.height * scaleY,
            0,
            0,
            outputSize,
            outputSize
        );

        return new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/jpeg', 0.9);
        });
    }, [completedCrop, maxSize]);

    // Upload file to server
    const uploadFile = async (file: File | Blob) => {
        setUploading(true);
        setError('');

        try {
            // Convert Blob to File if needed
            const uploadFile = file instanceof File
                ? file
                : new File([file], 'cropped-image.jpg', { type: 'image/jpeg' });

            const result = await uploadService.uploadImage(uploadFile);
            const fullUrl = uploadService.getImageUrl(result.url);
            setPreviewUrl(fullUrl);
            onChange(result.url); // Store relative URL in form data
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Lỗi khi upload ảnh');
        } finally {
            setUploading(false);
        }
    };

    // Handle crop confirmation
    const handleCropConfirm = async () => {
        const croppedBlob = await getCroppedImage();
        if (croppedBlob) {
            await uploadFile(croppedBlob);
        }
    };

    // Handle upload original without cropping
    const handleUploadOriginal = () => {
        if (originalFileRef.current) {
            uploadFile(originalFileRef.current);
        }
    };

    // Handle remove image
    const handleRemove = () => {
        setPreviewUrl('');
        onChange('');
    };

    // Display the image preview URL (handle both relative and absolute)
    const displayUrl = previewUrl
        ? (previewUrl.startsWith('http') ? previewUrl : uploadService.getImageUrl(previewUrl))
        : (value ? uploadService.getImageUrl(value) : '');

    return (
        <div className={`${className}`}>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={disabled || uploading}
            />

            {/* Preview area */}
            <div
                onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                className={`
                    relative w-32 h-32 border-2 border-dashed rounded-lg
                    ${disabled ? 'cursor-not-allowed bg-slate-100' : 'cursor-pointer hover:border-primary-400 hover:bg-slate-50'}
                    ${error ? 'border-red-400' : 'border-slate-300'}
                    flex items-center justify-center overflow-hidden transition-colors
                `}
            >
                {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Đang tải...</span>
                    </div>
                ) : displayUrl ? (
                    <>
                        <img
                            src={displayUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemove();
                                }}
                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 flex items-center justify-center shadow"
                            >
                                ✕
                            </button>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400 p-2 text-center">
                        <span className="text-2xl">📷</span>
                        <span className="text-xs">{placeholder}</span>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
            )}

            {/* Crop Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Cắt ảnh"
                size="lg"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Ảnh quá lớn ({maxSize}x{maxSize}px). Vui lòng cắt ảnh hoặc upload nguyên bản.
                    </p>

                    <div className="flex justify-center bg-slate-100 rounded-lg p-4 max-h-[60vh] overflow-auto">
                        {imgSrc && (
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={aspectRatio}
                                minWidth={100}
                                minHeight={100}
                            >
                                <img
                                    ref={imgRef}
                                    src={imgSrc}
                                    alt="Crop preview"
                                    onLoad={onImageLoad}
                                    className="max-w-full max-h-[50vh]"
                                />
                            </ReactCrop>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-secondary"
                            disabled={uploading}
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleUploadOriginal}
                            className="btn btn-secondary"
                            disabled={uploading}
                        >
                            {uploading ? 'Đang tải...' : 'Dùng ảnh gốc'}
                        </button>
                        <button
                            type="button"
                            onClick={handleCropConfirm}
                            className="btn btn-primary"
                            disabled={uploading || !completedCrop}
                        >
                            {uploading ? 'Đang tải...' : 'Xác nhận cắt'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ImageCropper;
