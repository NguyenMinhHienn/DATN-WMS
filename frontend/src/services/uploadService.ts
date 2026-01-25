import api from './api';

export interface UploadResponse {
    url: string;
    filename: string;
    originalName: string;
    size: number;
}

export const uploadService = {
    /**
     * Upload an image file
     * @param file The image file to upload
     * @returns The uploaded image URL and metadata
     */
    async uploadImage(file: File): Promise<UploadResponse> {
        const formData = new FormData();
        formData.append('image', file);

        const response = await api.post('/upload/image', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.data;
    },

    /**
     * Delete an uploaded image
     * @param filename The filename to delete
     */
    async deleteImage(filename: string): Promise<void> {
        await api.delete(`/upload/${filename}`);
    },

    /**
     * Get full URL for an uploaded image
     * @param path The relative path from upload (e.g., /uploads/filename.jpg)
     * @returns Full URL
     */
    getImageUrl(path: string): string {
        if (!path) return '';
        // If path is already a full URL, return as-is
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        // Use the same origin for uploaded files (served by backend)
        // In development, Vite proxies /api to backend, but /uploads needs direct access
        // Assuming backend runs on port 3000
        const backendUrl = 'http://localhost:3000';
        return `${backendUrl}${path}`;
    }
};
