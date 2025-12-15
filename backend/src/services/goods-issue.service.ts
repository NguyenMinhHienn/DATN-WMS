import { goodsIssueRepository } from '../repositories/goods-issue.repository';
import { CreateGoodsIssueDto, GoodsIssue, GoodsIssueItem, PaginatedResult } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class GoodsIssueService {
    async getAllIssues(
        page: number = 1,
        limit: number = 10,
        warehouseId?: number,
        status?: string,
        startDate?: string,
        endDate?: string
    ): Promise<PaginatedResult<GoodsIssue>> {
        return goodsIssueRepository.findAll(page, limit, warehouseId, status, startDate, endDate);
    }

    async getIssueById(id: number): Promise<GoodsIssue & { items: GoodsIssueItem[] }> {
        const issue = await goodsIssueRepository.findById(id);
        if (!issue) {
            throw new AppError('Goods issue not found', 404);
        }

        const items = await goodsIssueRepository.getItems(id);
        return { ...issue, items };
    }

    async createIssue(dto: CreateGoodsIssueDto, userId?: number): Promise<GoodsIssue> {
        if (!dto.items || dto.items.length === 0) {
            throw new AppError('At least one item is required', 400);
        }

        const issueId = await goodsIssueRepository.create(dto, userId);

        const issue = await goodsIssueRepository.findById(issueId);
        if (!issue) {
            throw new AppError('Failed to create goods issue', 500);
        }

        return issue;
    }

    async shipIssue(id: number, userId?: number): Promise<boolean> {
        const issue = await goodsIssueRepository.findById(id);
        if (!issue) {
            throw new AppError('Goods issue not found', 404);
        }

        if (issue.status === 'shipped' || issue.status === 'delivered') {
            throw new AppError('Issue is already shipped', 400);
        }

        if (issue.status === 'cancelled') {
            throw new AppError('Cannot ship a cancelled issue', 400);
        }

        return goodsIssueRepository.shipIssue(id, userId);
    }

    async updateStatus(id: number, status: string): Promise<boolean> {
        const issue = await goodsIssueRepository.findById(id);
        if (!issue) {
            throw new AppError('Goods issue not found', 404);
        }

        return goodsIssueRepository.updateStatus(id, status);
    }

    async deleteIssue(id: number): Promise<void> {
        const issue = await goodsIssueRepository.findById(id);
        if (!issue) {
            throw new AppError('Goods issue not found', 404);
        }

        if (issue.status !== 'draft') {
            throw new AppError('Only draft issues can be deleted', 400);
        }

        const deleted = await goodsIssueRepository.delete(id);
        if (!deleted) {
            throw new AppError('Failed to delete goods issue', 500);
        }
    }
}

export const goodsIssueService = new GoodsIssueService();
