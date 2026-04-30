import { dashboardRepository, SalesSummary, MonthlyReportRow } from '../repositories/dashboard.repository';

/**
 * Dashboard Service
 * Business logic cho dashboard lợi nhuận
 */

export interface MonthlyReportItem {
    month: number;
    revenue: number;
    cost: number;
    profit: number;
}

class DashboardService {

    /**
     * Lấy tổng hợp doanh thu, giá vốn, lợi nhuận
     */
    async getSummary(): Promise<SalesSummary> {
        return dashboardRepository.getSalesSummary();
    }

    /**
     * Lấy báo cáo theo tháng, fill đủ 12 tháng (tháng không có data = 0)
     */
    async getMonthlyReport(year: number): Promise<MonthlyReportItem[]> {
        const rawData = await dashboardRepository.getMonthlyReport(year);

        // Fill đủ 12 tháng
        const result: MonthlyReportItem[] = [];
        for (let m = 1; m <= 12; m++) {
            const found = rawData.find(r => r.month === m);
            const revenue = found ? Number(found.revenue) : 0;
            const cost = found ? Number(found.cost) : 0;
            result.push({
                month: m,
                revenue,
                cost,
                profit: revenue - cost, // Luôn tính profit = revenue - cost
            });
        }
        return result;
    }

    /**
     * Lấy chi tiết đơn hàng trong tháng (bao gồm online + nội bộ)
     */
    async getMonthlyDetail(year: number, month: number): Promise<any> {
        return dashboardRepository.getMonthlyDetail(year, month);
    }

    /**
     * Lấy chi tiết items của 1 đơn hàng
     */
    async getOrderItems(orderId: number, orderType: string): Promise<any[]> {
        return dashboardRepository.getOrderItems(orderId, orderType);
    }

    /**
     * Phân bố sản phẩm theo danh mục
     */
    async getCategoryDistribution() {
        return dashboardRepository.getCategoryDistribution();
    }

    /**
     * Top 5 sản phẩm bán chạy nhất
     */
    async getTopProducts() {
        return dashboardRepository.getTopProducts();
    }
}

export const dashboardService = new DashboardService();
