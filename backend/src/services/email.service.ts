import nodemailer from 'nodemailer';

/**
 * Email Service - Gửi email thông báo qua Gmail SMTP
 * Sử dụng Nodemailer + Gmail App Password
 */
class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    private getTransporter(): nodemailer.Transporter {
        if (!this.transporter) {
            const user = process.env.SMTP_USER;
            const pass = process.env.SMTP_PASS;

            if (!user || !pass) {
                console.warn('⚠️ SMTP_USER/SMTP_PASS chưa được cấu hình trong .env. Email sẽ không được gửi.');
                // Return a dummy transporter that logs instead of sending
                this.transporter = nodemailer.createTransport({ jsonTransport: true });
                return this.transporter;
            }

            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false,
                auth: { user, pass },
            });
        }
        return this.transporter;
    }

    private get isConfigured(): boolean {
        return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
    }

    /**
     * Gửi email phiếu thu cho khách hàng
     */
    async sendPaymentReceipt(to: string, data: {
        receiptNumber: string;
        debtorName: string;
        amount: number;
        paymentDate: string;
        paymentMethod: string;
        remainingDebt: number;
        sourceNumber: string;
        receivableNumber: string;
    }): Promise<boolean> {
        if (!this.isConfigured) {
            console.log(`📧 [MOCK] Gửi email phiếu thu ${data.receiptNumber} đến ${to}`);
            return false;
        }

        try {
            const paymentMethodLabel = this.getPaymentMethodLabel(data.paymentMethod);
            const html = this.buildPaymentReceiptHtml(data, paymentMethodLabel);

            await this.getTransporter().sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'StockFlow WMS'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to,
                subject: `[${data.receiptNumber}] Xác nhận thanh toán - ${data.debtorName}`,
                html,
            });

            console.log(`✅ Email phiếu thu ${data.receiptNumber} đã gửi đến ${to}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi gửi email phiếu thu đến ${to}:`, error);
            return false;
        }
    }

    /**
     * Gửi email nhắc nợ (sắp tới hạn hoặc quá hạn)
     */
    async sendPaymentReminder(to: string, data: {
        debtorName: string;
        receivableNumber: string;
        totalAmount: number;
        remainingAmount: number;
        dueDate: string;
        daysOverdue: number; // âm là chưa tới hạn, dương là quá hạn
        sourceNumber: string;
    }): Promise<boolean> {
        if (!this.isConfigured) {
            console.log(`📧 [MOCK] Gửi nhắc nợ ${data.receivableNumber} đến ${to}`);
            return false;
        }

        try {
            const html = this.buildReminderHtml(data);
            const isOverdue = data.daysOverdue > 0;
            const subject = isOverdue 
                ? `⚠️ [Nhắc nợ] ${data.receivableNumber} - Quá hạn ${data.daysOverdue} ngày`
                : `🗓️ [Nhắc nợ] ${data.receivableNumber} - Phải thanh toán ngày ${data.dueDate}`;

            await this.getTransporter().sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'StockFlow WMS'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to,
                subject,
                html,
            });

            console.log(`✅ Email nhắc nợ ${data.receivableNumber} đã gửi đến ${to}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi gửi email nhắc nợ đến ${to}:`, error);
            return false;
        }
    }

    /**
     * Gửi email nhắc nợ tổng hợp (Sổ nợ gộp)
     */
    async sendConsolidatedReminder(to: string, data: {
        debtorName: string;
        totalDebt: number;
        remainingDebt: number;
        overdueAmount: number;
    }): Promise<boolean> {
        if (!this.isConfigured) {
            console.log(`📧 [MOCK] Gửi nhắc nợ tổng hợp đến ${to}`);
            return false;
        }

        try {
            const html = this.buildConsolidatedReminderHtml(data);
            const isOverdue = data.overdueAmount > 0;
            const subject = isOverdue 
                ? `⚠️ [Nhắc nợ] Tổng hợp dư nợ quá hạn - ${data.debtorName}`
                : `🗓️ [Nhắc nợ] Bảng kê tổng hợp dư nợ - ${data.debtorName}`;

            await this.getTransporter().sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'StockFlow WMS'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to,
                subject,
                html,
            });

            console.log(`✅ Email nhắc nợ tổng hợp đã gửi đến ${to}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi gửi email nhắc nợ tổng hợp đến ${to}:`, error);
            return false;
        }
    }

    /**
     * Gửi email thông báo công nợ mới
     */
    async sendDebtCreatedNotice(to: string, data: {
        debtorName: string;
        receivableNumber: string;
        totalAmount: number;
        dueDate: string | null;
        paymentTerms: number;
        sourceNumber: string;
    }): Promise<boolean> {
        if (!this.isConfigured) {
            console.log(`📧 [MOCK] Gửi thông báo công nợ mới ${data.receivableNumber} đến ${to}`);
            return false;
        }

        try {
            const html = this.buildDebtCreatedHtml(data);

            await this.getTransporter().sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'StockFlow WMS'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to,
                subject: `[${data.receivableNumber}] Thông báo công nợ mới - ${data.debtorName}`,
                html,
            });

            console.log(`✅ Email thông báo công nợ ${data.receivableNumber} đã gửi đến ${to}`);
            return true;
        } catch (error) {
            console.error(`❌ Lỗi gửi email công nợ đến ${to}:`, error);
            return false;
        }
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('vi-VN').format(amount);
    }

    private getPaymentMethodLabel(method: string): string {
        const map: Record<string, string> = {
            'cash': 'Tiền mặt',
            'bank_transfer': 'Chuyển khoản ngân hàng',
            'banking_online': 'Thanh toán online',
            'cod_collected': 'Thu hộ COD',
            'other': 'Khác',
        };
        return map[method] || method;
    }

    private buildPaymentReceiptHtml(data: any, paymentMethodLabel: string): string {
        return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #fff;">
            <div style="background: linear-gradient(135deg, #6366F1, #8B5CF6); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">📄 Phiếu Thu Thanh Toán</h1>
                <p style="color: #E0E7FF; margin: 8px 0 0; font-size: 14px;">${data.receiptNumber}</p>
            </div>
            <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none;">
                <p style="color: #334155; font-size: 15px;">Kính gửi <strong>${data.debtorName}</strong>,</p>
                <p style="color: #475569; font-size: 14px;">Chúng tôi xác nhận đã nhận được khoản thanh toán của quý khách:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #EEF2FF;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #475569;">Mã phiếu thu</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #1E293B;">${data.receiptNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #475569;">Mã công nợ</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #1E293B;">${data.receivableNumber}</td>
                    </tr>
                    <tr style="background: #EEF2FF;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #475569;">Theo chứng từ</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #1E293B;">${data.sourceNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #475569;">Số tiền đã thu</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #059669; font-size: 18px;">
                            ${this.formatCurrency(data.amount)} VNĐ
                        </td>
                    </tr>
                    <tr style="background: #EEF2FF;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #475569;">Phương thức</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #1E293B;">${paymentMethodLabel}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #475569;">Ngày thanh toán</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #1E293B;">${data.paymentDate}</td>
                    </tr>
                    <tr style="background: ${data.remainingDebt > 0 ? '#FEF2F2' : '#ECFDF5'};">
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #475569;">Công nợ còn lại</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: ${data.remainingDebt > 0 ? '#DC2626' : '#059669'};">
                            ${data.remainingDebt > 0 ? `${this.formatCurrency(data.remainingDebt)} VNĐ` : '✅ Đã thanh toán đủ'}
                        </td>
                    </tr>
                </table>
                
                <p style="color: #94A3B8; font-size: 12px; margin-top: 20px; border-top: 1px solid #E2E8F0; padding-top: 16px;">
                    Đây là email tự động từ hệ thống StockFlow WMS. Nếu có thắc mắc, vui lòng liên hệ bộ phận kế toán.
                </p>
            </div>
            <div style="background: #1E293B; color: #94A3B8; padding: 16px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} StockFlow WMS | Phiếu thu điện tử
            </div>
        </div>`;
    }

    private buildReminderHtml(data: any): string {
        const isOverdue = data.daysOverdue > 0;
        const headerBg = isOverdue ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #F59E0B, #D97706)';
        const titleText = isOverdue ? '⚠️ Nhắc Nợ Quá Hạn' : '🗓️ Nhắc Lịch Thanh Toán';
        const subText = isOverdue ? `Quá hạn ${data.daysOverdue} ngày` : `Hạn chót vào ngày ${data.dueDate}`;
        const mainMsg = isOverdue 
            ? `<p style="color: #DC2626; font-weight: bold;">Công nợ ${data.receivableNumber} đã quá hạn thanh toán ${data.daysOverdue} ngày.</p>`
            : `<p style="color: #D97706; font-weight: bold;">Công nợ ${data.receivableNumber} sắp đến hạn thanh toán vào ngày ${data.dueDate}.</p>`;
        const dateColor = isOverdue ? '#DC2626' : '#D97706';

        return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #fff;">
            <div style="background: ${headerBg}; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">${titleText}</h1>
                <p style="color: #FEF3C7; margin: 8px 0 0; font-size: 14px;">${data.receivableNumber} - ${subText}</p>
            </div>
            <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none;">
                <p style="color: #334155;">Kính gửi <strong>${data.debtorName}</strong>,</p>
                ${mainMsg}
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #FFFBEB;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Mã công nợ</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold;">${data.receivableNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Theo chứng từ</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">${data.sourceNumber}</td>
                    </tr>
                    <tr style="background: #FFFBEB;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Tổng phải thu</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold;">${this.formatCurrency(data.totalAmount)} VNĐ</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Còn nợ</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #DC2626; font-size: 18px;">${this.formatCurrency(data.remainingAmount)} VNĐ</td>
                    </tr>
                    <tr style="background: #FFFBEB;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Hạn thanh toán</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: ${dateColor}; font-weight: bold;">${data.dueDate}</td>
                    </tr>
                </table>
                
                <p style="color: #475569; font-size: 14px;">Vui lòng thanh toán sớm nhất có thể. Xin cảm ơn!</p>
            </div>
            <div style="background: #1E293B; color: #94A3B8; padding: 16px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} StockFlow WMS
            </div>
        </div>`;
    }

    private buildConsolidatedReminderHtml(data: any): string {
        const isOverdue = data.overdueAmount > 0;
        const headerBg = isOverdue ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'linear-gradient(135deg, #F59E0B, #D97706)';
        const titleText = isOverdue ? '⚠️ Thông Báo Nợ Quá Hạn' : '🗓️ Thông Báo Dư Nợ';
        const subText = isOverdue ? `Quý khách đang có khoản nợ quá hạn` : `Bảng kê tổng hợp dư nợ`;
        
        return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #fff;">
            <div style="background: ${headerBg}; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">${titleText}</h1>
                <p style="color: #FEF3C7; margin: 8px 0 0; font-size: 14px;">${subText}</p>
            </div>
            <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none;">
                <p style="color: #334155;">Kính gửi <strong>${data.debtorName}</strong>,</p>
                <p style="color: #475569;">Chúng tôi xin gửi thông báo về tổng số dư công nợ của quý khách trên hệ thống:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #FFFBEB;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Tổng phải thu</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold;">${this.formatCurrency(data.totalDebt)} VNĐ</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Tổng còn nợ</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #D97706; font-size: 16px;">${this.formatCurrency(data.remainingDebt)} VNĐ</td>
                    </tr>
                    ${isOverdue ? `
                    <tr style="background: #FEF2F2;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0; color: #DC2626; font-weight: bold;">Trong đó nợ quá hạn</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #DC2626; font-size: 16px;">${this.formatCurrency(data.overdueAmount)} VNĐ</td>
                    </tr>
                    ` : ''}
                </table>
                
                <p style="color: #475569; font-size: 14px;">Vui lòng thu xếp thanh toán sớm nhất có thể. Xin cảm ơn!</p>
            </div>
            <div style="background: #1E293B; color: #94A3B8; padding: 16px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} StockFlow WMS
            </div>
        </div>`;
    }

    private buildDebtCreatedHtml(data: any): string {
        const dueDateStr = data.dueDate
            ? new Date(data.dueDate).toLocaleDateString('vi-VN')
            : 'Thanh toán ngay';

        return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #fff;">
            <div style="background: linear-gradient(135deg, #0EA5E9, #3B82F6); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">📋 Thông Báo Công Nợ Mới</h1>
                <p style="color: #BFDBFE; margin: 8px 0 0; font-size: 14px;">${data.receivableNumber}</p>
            </div>
            <div style="padding: 24px; border: 1px solid #E2E8F0; border-top: none;">
                <p style="color: #334155;">Kính gửi <strong>${data.debtorName}</strong>,</p>
                <p style="color: #475569;">Một khoản công nợ mới đã được ghi nhận từ chứng từ <strong>${data.sourceNumber}</strong>:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr style="background: #EFF6FF;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Mã công nợ</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold;">${data.receivableNumber}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Số tiền phải thu</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold; color: #DC2626; font-size: 18px;">${this.formatCurrency(data.totalAmount)} VNĐ</td>
                    </tr>
                    <tr style="background: #EFF6FF;">
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Điều khoản</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">${data.paymentTerms > 0 ? `${data.paymentTerms} ngày` : 'Thanh toán ngay'}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px; border: 1px solid #E2E8F0;">Hạn thanh toán</td>
                        <td style="padding: 12px; border: 1px solid #E2E8F0; font-weight: bold;">${dueDateStr}</td>
                    </tr>
                </table>
                
                <p style="color: #475569; font-size: 14px;">Vui lòng thanh toán đúng hạn. Xin cảm ơn!</p>
            </div>
            <div style="background: #1E293B; color: #94A3B8; padding: 16px; text-align: center; font-size: 12px;">
                © ${new Date().getFullYear()} StockFlow WMS
            </div>
        </div>`;
    }
}

export const emailService = new EmailService();
