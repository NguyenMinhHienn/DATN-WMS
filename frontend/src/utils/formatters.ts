/**
 * Định dạng tiền tệ
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};

/**
 * Định dạng ngày tháng
 */
// src/utils/formatters.ts
export const formatDate = (dateString: string | Date): string => {
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return date.toLocaleDateString('vi-VN');
    } catch {
        return 'N/A';
    }
};

export const formatDateTime = (dateString: string | Date): string => {
    try {
        const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
        return date.toLocaleString('vi-VN');
    } catch {
        return 'N/A';
    }
};

/**
 * Định dạng số điện thoại
 */
export const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
    }
    return phone;
};

/**
 * Cắt ngắn text với ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

/**
 * Định dạng số lượng
 */
export const formatQuantity = (quantity: number, unit?: string): string => {
    if (unit) {
        return `${quantity} ${unit}`;
    }
    return quantity.toString();
};

/**
 * Định dạng phần trăm
 */
export const formatPercent = (percent: number): string => {
    return `${percent.toFixed(1)}%`;
};

/**
 * Định dạng thời gian từ giờ
 */
export const formatDuration = (hours: number): string => {
    if (hours < 1) {
        const minutes = Math.round(hours * 60);
        return `${minutes} phút`;
    }
    if (hours < 24) {
        return `${Math.round(hours)} giờ`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    if (remainingHours === 0) {
        return `${days} ngày`;
    }
    return `${days} ngày ${remainingHours} giờ`;
};