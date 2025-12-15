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
}

export const reportService = new ReportService();
