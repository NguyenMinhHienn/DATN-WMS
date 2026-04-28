import cron, { ScheduledTask } from 'node-cron';
import { receivableService } from './receivable.service';
import { payableService } from './payable.service';

/**
 * Scheduler Service - Cron jobs tự động
 * 
 * Jobs:
 * 1. Kiểm tra nợ quá hạn: Mỗi ngày lúc 00:05 AM
 * 2. Kiểm tra nợ NCC quá hạn: Mỗi ngày lúc 00:10 AM
 */
class SchedulerService {
    private jobs: ScheduledTask[] = [];

    /**
     * Khởi chạy tất cả cron jobs
     */
    start(): void {
        console.log('⏰ Khởi động Scheduler Service...');

        // Job 1: Kiểm tra & đánh dấu công nợ quá hạn - chạy mỗi ngày lúc 00:05
        const overdueJob = cron.schedule('5 0 * * *', async () => {
            console.log(`[Scheduler] ${new Date().toISOString()} - Bắt đầu kiểm tra nợ quá hạn...`);
            try {
                const count = await receivableService.checkAndMarkOverdue();
                if (count > 0) {
                    console.log(`[Scheduler] ✅ Đã đánh dấu ${count} công nợ quá hạn`);
                } else {
                    console.log(`[Scheduler] ✅ Không có công nợ nào mới quá hạn`);
                }
            } catch (error) {
                console.error('[Scheduler] ❌ Lỗi kiểm tra nợ quá hạn:', error);
            }
        }, {
            timezone: 'Asia/Ho_Chi_Minh'
        });

        // Job 2: Kiểm tra công nợ NCC quá hạn - chạy mỗi ngày lúc 00:10
        const payableOverdueJob = cron.schedule('10 0 * * *', async () => {
            console.log(`[Scheduler] ${new Date().toISOString()} - Bắt đầu kiểm tra nợ NCC quá hạn...`);
            try {
                const count = await payableService.checkAndMarkOverdue();
                if (count > 0) {
                    console.log(`[Scheduler] ✅ Đã đánh dấu ${count} công nợ NCC quá hạn`);
                } else {
                    console.log(`[Scheduler] ✅ Không có công nợ NCC nào mới quá hạn`);
                }
            } catch (error) {
                console.error('[Scheduler] ❌ Lỗi kiểm tra nợ NCC quá hạn:', error);
            }
        }, {
            timezone: 'Asia/Ho_Chi_Minh'
        });

        this.jobs.push(overdueJob, payableOverdueJob);
        console.log('  ✅ Job [Kiểm tra nợ quá hạn] - Mỗi ngày lúc 00:05 (Asia/Ho_Chi_Minh)');
        console.log('  ✅ Job [Kiểm tra nợ NCC quá hạn] - Mỗi ngày lúc 00:10 (Asia/Ho_Chi_Minh)');

        // Chạy kiểm tra 1 lần ngay khi server khởi động (delay 10s để DB sẵn sàng)
        setTimeout(async () => {
            try {
                console.log('[Scheduler] 🔄 Kiểm tra nợ quá hạn lần đầu khi khởi động...');
                const count1 = await receivableService.checkAndMarkOverdue();
                if (count1 > 0) {
                    console.log(`[Scheduler] ⚠️ Phát hiện ${count1} công nợ quá hạn khi khởi động!`);
                }
                const count2 = await payableService.checkAndMarkOverdue();
                if (count2 > 0) {
                    console.log(`[Scheduler] ⚠️ Phát hiện ${count2} công nợ NCC quá hạn khi khởi động!`);
                }
            } catch (error) {
                console.error('[Scheduler] Lỗi kiểm tra lần đầu:', error);
            }
        }, 10000);

        console.log('⏰ Scheduler Service đã sẵn sàng!');
    }

    /**
     * Dừng tất cả jobs
     */
    stop(): void {
        this.jobs.forEach(job => job.stop());
        this.jobs = [];
        console.log('⏰ Scheduler Service đã dừng');
    }
}

export const schedulerService = new SchedulerService();
