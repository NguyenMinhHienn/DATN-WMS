import React from 'react';
import { FinancialAuditLog } from '../services/auditService';

interface Props {
    logs: FinancialAuditLog[];
    loading?: boolean;
}

const formatVND = (value: number | string) => {
    return new Intl.NumberFormat('vi-VN').format(Number(value));
};

const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `Vừa xong`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays} ngày trước`;
    
    return date.toLocaleString('vi-VN');
};

const AuditTimeline: React.FC<Props> = ({ logs, loading }) => {
    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400 italic">
                Chưa có lịch sử thao tác nào được ghi nhận.
            </div>
        );
    }

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'CREATE': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">KHỞI TẠO</span>;
            case 'APPROVE': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">PHÊ DUYỆT</span>;
            case 'REJECT': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">TỪ CHỐI</span>;
            case 'CANCEL': return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">HỦY BỎ</span>;
            case 'UPDATE': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">CẬP NHẬT</span>;
            default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold shrink-0">{action}</span>;
        }
    };

    return (
        <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100 ml-[-1px]"></div>

            <div className="space-y-6 relative">
                {logs.map((log, index) => {
                    let meta: any = null;
                    if (log.metadata) {
                        try {
                            meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                        } catch (e) {
                            console.error('Failed to parse metadata', e);
                        }
                    }

                    return (
                        <div key={log.id || index} className="flex gap-4 items-start group">
                            {/* Dot */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white shadow-sm ${
                                log.action === 'APPROVE' ? 'bg-emerald-500' : 
                                log.action === 'REJECT' ? 'bg-rose-500' : 
                                log.action === 'CREATE' ? 'bg-blue-500' : 'bg-slate-400'
                            }`}>
                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 group-hover:border-indigo-200 transition-colors shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {getActionBadge(log.action)}
                                        {meta?.self_approved && (
                                            <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-sm">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                TỰ DUYỆT
                                            </span>
                                        )}
                                        {meta?.is_batch && (
                                            <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-sm">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                                                GỘP
                                            </span>
                                        )}
                                        <span className="font-bold text-slate-800 text-sm">
                                            {log.actor_name || 'Hệ thống'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end ml-2 shrink-0">
                                        <span className="text-[10px] text-slate-400 font-medium italic">
                                            {new Date(log.created_at).toLocaleString('vi-VN')}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold mt-0.5">
                                            {getRelativeTime(log.created_at)}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-xs text-slate-600 leading-relaxed">
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                                        {log.amount && (
                                            <div>
                                                <span className="text-slate-500">Số tiền:</span>{' '}
                                                <span className="font-black text-indigo-600 text-sm">{formatVND(log.amount)} ₫</span>
                                            </div>
                                        )}
                                        
                                        {log.status_after && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-500">Trạng thái:</span> 
                                                <span className="font-medium text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                    {log.status_after}
                                                </span>
                                            </div>
                                        )}

                                        {meta?.payment_method && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-500">Hình thức:</span> 
                                                <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                                    {meta.payment_method === 'cash' ? '💵 Tiền mặt' : 
                                                     meta.payment_method === 'bank_transfer' ? '🏦 Chuyển khoản' : meta.payment_method}
                                                </span>
                                            </div>
                                        )}

                                        {meta?.bank_reference && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-slate-500">Mã GD:</span> 
                                                <span className="font-medium text-slate-700">{meta.bank_reference}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Balance Table */}
                                    {meta?.balance_before && meta?.balance_after && (
                                        <div className="mt-3 mb-2 rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-3 py-1.5 font-medium w-24"></th>
                                                        <th className="px-3 py-1.5 font-bold text-slate-500 w-1/2">TRƯỚC</th>
                                                        <th className="px-3 py-1.5 font-bold text-slate-800 w-1/2">SAU</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    <tr>
                                                        <td className="px-3 py-1.5 text-slate-500 font-medium">Đã trả</td>
                                                        <td className="px-3 py-1.5 text-slate-500">{formatVND(meta.balance_before.paid_amount)} ₫</td>
                                                        <td className="px-3 py-1.5 font-bold text-emerald-600 flex items-center gap-1">
                                                            {formatVND(meta.balance_after.paid_amount)} ₫
                                                            {meta.balance_after.paid_amount > meta.balance_before.paid_amount && (
                                                                <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-3 py-1.5 text-slate-500 font-medium">Còn nợ</td>
                                                        <td className="px-3 py-1.5 text-slate-500">{formatVND(meta.balance_before.remaining)} ₫</td>
                                                        <td className="px-3 py-1.5 font-bold text-rose-600 flex items-center gap-1">
                                                            {formatVND(meta.balance_after.remaining)} ₫
                                                            {meta.balance_after.remaining < meta.balance_before.remaining && (
                                                                <svg className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {log.notes && (
                                        <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-100 italic text-slate-500 text-[11px]">
                                            "{log.notes}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AuditTimeline;
