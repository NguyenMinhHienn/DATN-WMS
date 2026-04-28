import React from 'react';
import { FinancialAuditLog } from '../services/auditService';

interface Props {
    logs: FinancialAuditLog[];
    loading?: boolean;
}

const formatVND = (value: number | string) => {
    return new Intl.NumberFormat('vi-VN').format(Number(value));
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
            case 'CREATE': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">KHỞI TẠO</span>;
            case 'APPROVE': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">PHÊ DUYỆT</span>;
            case 'REJECT': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">TỪ CHỐI</span>;
            case 'CANCEL': return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">HỦY BỎ</span>;
            case 'UPDATE': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">CẬP NHẬT</span>;
            default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">{action}</span>;
        }
    };

    return (
        <div className="relative">
            {/* Vertical Line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100 ml-[-1px]"></div>

            <div className="space-y-6 relative">
                {logs.map((log, index) => (
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
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    {getActionBadge(log.action)}
                                    <span className="font-bold text-slate-800 text-sm">
                                        {log.actor_name || 'Hệ thống'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium italic">
                                    {new Date(log.created_at).toLocaleString('vi-VN')}
                                </span>
                            </div>

                            <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                                {log.amount && (
                                    <div className="mb-1">
                                        Số tiền: <span className="font-bold text-indigo-600">{formatVND(log.amount)} ₫</span>
                                    </div>
                                )}
                                
                                {log.status_after && (
                                    <div className="mb-1">
                                        Trạng thái: 
                                        <span className="ml-1 font-medium text-slate-700 uppercase">
                                            {log.status_after}
                                        </span>
                                    </div>
                                )}

                                {log.notes && (
                                    <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-100 italic text-slate-500">
                                        "{log.notes}"
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AuditTimeline;
