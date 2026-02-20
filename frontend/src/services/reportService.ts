import api from './api';
import { ApiResponse, DashboardStats, SalesSummary, MonthlyReportItem } from '../interface';

export const reportService = {
    async getDashboard(): Promise<DashboardStats> {
        const response = await api.get<ApiResponse<DashboardStats>>('/reports/dashboard');
        return response.data.data!;
    },

    async getSalesSummary(): Promise<SalesSummary> {
        const response = await api.get<ApiResponse<SalesSummary>>('/dashboard/summary');
        return response.data.data!;
    },

    async getMonthlyReport(year?: number): Promise<MonthlyReportItem[]> {
        const params = year ? `?year=${year}` : '';
        const response = await api.get<ApiResponse<MonthlyReportItem[]>>(`/dashboard/monthly-report${params}`);
        return response.data.data || [];
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

