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
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Báo cáo</h1>
                <p className="text-slate-600">Tạo và xem báo cáo</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'inventory', label: '📋 Báo cáo tồn kho' },
                    { key: 'movements', label: '📊 Báo cáo biến động' },
                    { key: 'stockValue', label: '💰 Giá trị tồn kho' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.key ? 'bg-primary-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="card mb-6">
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
                    <button onClick={loadReport} className="btn btn-primary">Tạo báo cáo</button>
                </div>
            </div>

            {/* Report Content */}
            <div className="table-container">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : reportData.length === 0 ? (
                    <div className="py-12 text-center text-slate-500">
                        Nhấn "Tạo báo cáo" để xem dữ liệu
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                {activeTab === 'inventory' && (
                                    <>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Sản phẩm</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Mã SKU</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Kho</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">SL</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Giá trị</th>
                                    </>
                                )}
                                {activeTab === 'movements' && (
                                    <>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Ngày</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Sản phẩm</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Kho</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Loại</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Thay đổi</th>
                                    </>
                                )}
                                {activeTab === 'stockValue' && (
                                    <>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Kho</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Số sản phẩm</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tổng SL</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-slate-600">Tổng giá trị</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.map((row, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                    {activeTab === 'inventory' && (
                                        <>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-800">{row.product_name}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600 font-mono">{row.sku}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600">{row.warehouse_name}</td>
                                            <td className="py-3 px-4 text-sm text-right">{row.quantity_on_hand}</td>
                                            <td className="py-3 px-4 text-sm text-right font-medium">{new Intl.NumberFormat('vi-VN').format(row.total_value)}</td>
                                        </>
                                    )}
                                    {activeTab === 'movements' && (
                                        <>
                                            <td className="py-3 px-4 text-sm text-slate-600">{row.date}</td>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-800">{row.product_name}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600">{row.warehouse_name}</td>
                                            <td className="py-3 px-4 text-sm text-slate-600 capitalize">{row.movement_type?.replace(/_/g, ' ')}</td>
                                            <td className={`py-3 px-4 text-sm text-right font-medium ${row.quantity_change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {row.quantity_change > 0 ? '+' : ''}{row.quantity_change}
                                            </td>
                                        </>
                                    )}
                                    {activeTab === 'stockValue' && (
                                        <>
                                            <td className="py-3 px-4 text-sm font-medium text-slate-800">{row.warehouse_name}</td>
                                            <td className="py-3 px-4 text-sm text-right">{row.product_count}</td>
                                            <td className="py-3 px-4 text-sm text-right">{row.total_quantity}</td>
                                            <td className="py-3 px-4 text-sm text-right font-bold text-primary-600">{new Intl.NumberFormat('vi-VN').format(row.total_value)}</td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Reports;
