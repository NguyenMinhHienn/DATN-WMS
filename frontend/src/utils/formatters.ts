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
export const formatDate = (dateString: string | Date, includeTime: boolean = false): string => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (includeTime) {
        return new Intl.DateTimeFormat('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }
    
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
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
