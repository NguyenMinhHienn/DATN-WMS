import api from './api';
import { ApiResponse, DashboardStats, SalesSummary, MonthlyReportItem } from '../interface';

let monthlyCache: { year: number; data: MonthlyReportItem[] } | null = null;

export const reportService = {
    async getDashboard(): Promise<DashboardStats> {
        const response = await api.get<ApiResponse<DashboardStats>>('/reports/dashboard');
        return response.data.data!;
    },

    async getSalesSummary(): Promise<SalesSummary> {
        const response = await api.get<ApiResponse<SalesSummary>>('/dashboard/summary');
        return response.data.data!;
    },

    async getMonthlyReport(year: number): Promise<MonthlyReportItem[]> {
        if (monthlyCache?.year === year) return monthlyCache.data;
        
        try {
            const response = await api.get<ApiResponse<MonthlyReportItem[]>>('/dashboard/monthly-report', { params: { year } });
            const data = response.data?.data || (response.data as any) || [];
            monthlyCache = { year, data };
            return data;
        } catch (error) {
            console.error('getMonthlyReport failed:', error);
            return [];
        }
    },

    async getMonthlyDetail(year: number, month: number): Promise<any> {
        const response = await api.get<ApiResponse<any>>(`/dashboard/monthly-detail/${year}/${month}`);
        return response.data.data;
    },

    async getInventoryReport(warehouseId?: number): Promise<any[]> {
        const params = warehouseId ? `?warehouse_id=${warehouseId}` : '';
        const response = await api.get<ApiResponse<any[]>>(`/reports/inventory${params}`);
        return response.data.data || [];
    },

    async getMovementReport(
        startDate: string,
        endDate: string,
        warehouseId?: number,
        movementType?: string
    ): Promise<any[]> {
        const params = new URLSearchParams();
        params.append('start_date', startDate);
        params.append('end_date', endDate);
        if (warehouseId) params.append('warehouse_id', warehouseId.toString());
        if (movementType) params.append('movement_type', movementType);

        const response = await api.get<ApiResponse<any[]>>(`/reports/movements?${params}`);
        return response.data.data || [];
    },

    async getStockValueReport(): Promise<any[]> {
        const response = await api.get<ApiResponse<any[]>>('/reports/stock-value');
        return response.data.data || [];
    },
};

