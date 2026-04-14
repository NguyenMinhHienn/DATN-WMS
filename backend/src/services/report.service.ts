import { reportRepository } from '../repositories/report.repository';
import { DashboardStats, InventoryReport, MovementReport } from '../types';

export class ReportService {
    async getDashboardStats(): Promise<DashboardStats> {
        return reportRepository.getDashboardStats();
    }

    async getInventoryReport(warehouseId?: number): Promise<InventoryReport[]> {
        return reportRepository.getInventoryReport(warehouseId);
    }

    async getMovementReport(
        startDate: string,
        endDate: string,
        warehouseId?: number,
        movementType?: string
    ): Promise<MovementReport[]> {
        return reportRepository.getMovementReport(startDate, endDate, warehouseId, movementType);
    }

    async getStockValueReport(): Promise<any[]> {
        return reportRepository.getStockValueReport();
    }

    async getProductStockSummary(productId: number): Promise<any[]> {
        return reportRepository.getProductStockSummary(productId);
    }

    // ==================== NEW ANALYTICS METHODS ====================

    async getKpiOverview(startDate: string, endDate: string): Promise<any> {
        return reportRepository.getKpiOverview(startDate, endDate);
    }

    async getTopSellingProducts(startDate: string, endDate: string, limit: number = 10): Promise<any[]> {
        return reportRepository.getTopSellingProducts(startDate, endDate, limit);
    }

    async getMovementSummary(startDate: string, endDate: string): Promise<any> {
        return reportRepository.getMovementSummary(startDate, endDate);
    }

    async getStockValueByProduct(warehouseId?: number): Promise<any[]> {
        return reportRepository.getStockValueByProduct(warehouseId);
    }

    async getStockValueByCategory(): Promise<any[]> {
        return reportRepository.getStockValueByCategory();
    }

    async getSmartAlerts(): Promise<any> {
        return reportRepository.getSmartAlerts();
    }

    async getProductDrillDown(productId: number, startDate?: string, endDate?: string): Promise<any> {
        return reportRepository.getProductDrillDown(productId, startDate, endDate);
    }
}

export const reportService = new ReportService();

