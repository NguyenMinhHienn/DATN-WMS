import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { warehouseService } from '../../services/warehouseService';
import { Warehouse } from '../../interface';

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'stockValue'>('inventory');
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState<number | undefined>();
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadWarehouses(); }, []);

    const loadWarehouses = async () => {
        try {
            const data = await warehouseService.getAll();
            setWarehouses(data);
        } catch (error) {
            console.error('Failed to load warehouses:', error);
        }
    };

    const loadReport = async () => {
        setLoading(true);
        try {
            let data: any[];
            switch (activeTab) {
                case 'inventory':
                    data = await reportService.getInventoryReport(selectedWarehouse);
                    break;
                case 'movements':
                    data = await reportService.getMovementReport(startDate, endDate, selectedWarehouse);
                    break;
                case 'stockValue':
                    data = await reportService.getStockValueReport();
                    break;
                default:
                    data = [];
            }
            setReportData(data);
        } catch (error) {
            console.error('Failed to load report:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">
                    <span className="gradient-text">Báo cáo</span>
                </h1>
                <p className="text-slate-400 mt-1">Tạo và xem báo cáo hệ thống</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {[
                    { key: 'inventory', label: '📋 Báo cáo tồn kho' },
                    { key: 'movements', label: '📊 Báo cáo biến động' },
                    { key: 'stockValue', label: '💰 Giá trị tồn kho' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 ${activeTab === tab.key
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50 border border-slate-700/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="chart-container mb-6">
                <div className="flex flex-wrap gap-4 items-end">
                    {activeTab !== 'stockValue' && (
                        <div>
                            <label className="label">Kho</label>
                            <select value={selectedWarehouse || ''} onChange={(e) => setSelectedWarehouse(e.target.value ? parseInt(e.target.value) : undefined)} className="input">
                                <option value="">Tất cả các kho</option>
                                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                            </select>
                        </div>
                    )}
                    {activeTab === 'movements' && (
                        <>
                            <div>
                                <label className="label">Từ ngày</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input" />
                            </div>
                            <div>
                                <label className="label">Đến ngày</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input" />
                            </div>
                        </>
                    )}
                    <button onClick={loadReport} className="btn btn-primary">
                        <span className="mr-2">📊</span> Tạo báo cáo
                    </button>
                </div>
            </div>

            {/* Report Content */}
            <div className="chart-container p-0 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                            <span className="text-5xl opacity-50">📊</span>
                            <p className="text-slate-500">Nhấn "Tạo báo cáo" để xem dữ liệu</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50 border-b border-slate-700/50">
                                <tr>
                                    {activeTab === 'inventory' && (
                                        <>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Sản phẩm</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Mã SKU</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">SL</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Giá trị</th>
                                        </>
                                    )}
                                    {activeTab === 'movements' && (
                                        <>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Ngày</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Sản phẩm</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Loại</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Thay đổi</th>
                                        </>
                                    )}
                                    {activeTab === 'stockValue' && (
                                        <>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Kho</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Số sản phẩm</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Tổng SL</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Tổng giá trị</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors">
                                        {activeTab === 'inventory' && (
                                            <>
                                                <td className="py-4 px-6 text-sm font-medium text-white">{row.product_name}</td>
                                                <td className="py-4 px-6 text-sm text-indigo-300 font-mono">{row.sku}</td>
                                                <td className="py-4 px-6 text-sm text-slate-300">{row.warehouse_name}</td>
                                                <td className="py-4 px-6 text-sm text-right text-white">{row.quantity_on_hand}</td>
                                                <td className="py-4 px-6 text-sm text-right font-medium text-emerald-400">{new Intl.NumberFormat('vi-VN').format(row.total_value)}</td>
                                            </>
                                        )}
                                        {activeTab === 'movements' && (
                                            <>
                                                <td className="py-4 px-6 text-sm text-slate-400">{row.date}</td>
                                                <td className="py-4 px-6 text-sm font-medium text-white">{row.product_name}</td>
                                                <td className="py-4 px-6 text-sm text-slate-300">{row.warehouse_name}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`badge ${row.movement_type?.includes('in') || row.movement_type === 'goods_receipt' ? 'badge-success' : 'badge-danger'}`}>
                                                        {row.movement_type?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className={`py-4 px-6 text-sm text-right font-bold ${row.quantity_change > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {row.quantity_change > 0 ? '+' : ''}{row.quantity_change}
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'stockValue' && (
                                            <>
                                                <td className="py-4 px-6 text-sm font-medium text-white">{row.warehouse_name}</td>
                                                <td className="py-4 px-6 text-sm text-right text-slate-300">{row.product_count}</td>
                                                <td className="py-4 px-6 text-sm text-right text-slate-300">{row.total_quantity}</td>
                                                <td className="py-4 px-6 text-sm text-right font-bold text-indigo-400">{new Intl.NumberFormat('vi-VN').format(row.total_value)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
