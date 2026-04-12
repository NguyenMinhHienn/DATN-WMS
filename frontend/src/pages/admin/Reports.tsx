import React, { useState, useEffect, useMemo } from 'react';
import { reportService } from '../../services/reportService';
import { warehouseService } from '../../services/warehouseService';
import { Warehouse } from '../../interface';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip as ChartTooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement);

const Reports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'inventory' | 'movements' | 'stockValue'>('inventory');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [reportData, setReportData] = useState<any[]>([]);
    const [inventoryForChart, setInventoryForChart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const loadReport = async () => {
        setLoading(true);
        try {
            let data: any[];
            switch (activeTab) {
                case 'inventory':
                    data = await reportService.getInventoryReport(1);
                    break;
                case 'movements':
                    data = await reportService.getMovementReport(startDate, endDate, 1);
                    break;
                case 'stockValue':
                    const rawData = await reportService.getStockValueReport();
                    data = rawData.filter((d: any) => d.warehouse_id === 1);
                    // Fetch inventory cho biểu đồ Doughnut
                    const invData = await reportService.getInventoryReport(1);
                    setInventoryForChart(invData);
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

    const inventoryChartData = useMemo(() => {
        if (activeTab !== 'inventory' || !reportData.length) return null;
        const sorted = [...reportData].sort((a, b) => b.quantity_on_hand - a.quantity_on_hand).slice(0, 10);
        return {
            labels: sorted.map(item => item.product_name),
            datasets: [{
                label: 'Số lượng tồn kho',
                data: sorted.map(item => item.quantity_on_hand),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderRadius: 4,
            }]
        };
    }, [activeTab, reportData]);

    const movementsChartData = useMemo(() => {
        if (activeTab !== 'movements' || !reportData.length) return null;
        const dailyData: Record<string, { in: number, out: number }> = {};
        reportData.forEach(row => {
            let d = row.date;
            if (typeof d === 'string' && d.includes('T')) d = d.split('T')[0];
            if (!dailyData[d]) dailyData[d] = { in: 0, out: 0 };
            if (row.quantity_change > 0) dailyData[d].in += row.quantity_change;
            else if (row.quantity_change < 0) dailyData[d].out += Math.abs(row.quantity_change);
        });
        const sortedDates = Object.keys(dailyData).sort();
        return {
            labels: sortedDates,
            datasets: [
                {
                    label: 'Tổng Nhập kho',
                    data: sortedDates.map(d => dailyData[d].in),
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 4,
                },
                {
                    label: 'Tổng Xuất kho',
                    data: sortedDates.map(d => dailyData[d].out),
                    backgroundColor: 'rgba(244, 63, 94, 0.8)',
                    borderRadius: 4,
                }
            ]
        };
    }, [activeTab, reportData]);

    const stockValueChartData = useMemo(() => {
        if (activeTab !== 'stockValue' || !inventoryForChart || inventoryForChart.length === 0) return null;
        const sorted = [...inventoryForChart].sort((a, b) => b.total_value - a.total_value);
        const top5 = sorted.slice(0, 5);
        const others = sorted.slice(5).reduce((sum, item) => sum + Number(item.total_value), 0);
        
        const labels = [...top5.map(item => item.product_name)];
        const data = [...top5.map(item => item.total_value)];
        if (others > 0) {
            labels.push('Các sản phẩm khác');
            data.push(others);
        }
        
        return {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)', 
                    'rgba(16, 185, 129, 0.8)', 
                    'rgba(244, 63, 94, 0.8)',  
                    'rgba(245, 158, 11, 0.8)', 
                    'rgba(14, 165, 233, 0.8)', 
                    'rgba(100, 116, 139, 0.8)' 
                ],
                borderWidth: 0,
            }]
        };
    }, [activeTab, inventoryForChart]);

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold">
                    <span className="gradient-text">Báo cáo</span>
                </h1>
                <p className="text-slate-600 mt-1">Tạo và xem báo cáo hệ thống</p>
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
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-blue-900 shadow-lg shadow-indigo-500/25'
                                : 'bg-blue-50/30 text-slate-600 hover:text-blue-900 hover:bg-slate-100 border border-blue-100'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="chart-container mb-6">
                <div className="flex flex-wrap gap-4 items-end">

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
                    <div className="flex flex-col gap-6">
                        {/* CHART SECTIONS */}
                        {activeTab === 'inventory' && inventoryChartData && (
                            <div className="p-5 bg-white rounded-xl border border-blue-100">
                                <h3 className="text-lg font-bold text-blue-900 mb-4">Top 10 Sản phẩm tồn kho nhiều nhất</h3>
                                <div className="h-80"><Bar data={inventoryChartData} options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } }} /></div>
                            </div>
                        )}
                        {activeTab === 'movements' && movementsChartData && (
                            <div className="p-5 bg-white rounded-xl border border-blue-100">
                                <h3 className="text-lg font-bold text-blue-900 mb-4">Lưu lượng biến động theo ngày</h3>
                                <div className="h-80"><Bar data={movementsChartData} options={{ maintainAspectRatio: false }} /></div>
                            </div>
                        )}
                        
                        {/* 3B DASHBOARD CONTENT FOR STOCK VALUE */}
                        {activeTab === 'stockValue' && reportData[0] ? (
                            <div className="space-y-6 mt-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-indigo-900/50 to-slate-800 p-6 rounded-2xl border border-blue-200">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">📦</div>
                                            <div>
                                                <p className="text-slate-600 text-sm font-medium">Tổng mã hàng hóa</p>
                                                <h3 className="text-2xl font-bold text-blue-900 mt-1">{reportData[0].product_count}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-emerald-900/50 to-slate-800 p-6 rounded-2xl border border-emerald-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl">📋</div>
                                            <div>
                                                <p className="text-slate-600 text-sm font-medium">Tổng SL kiểm kê</p>
                                                <h3 className="text-2xl font-bold text-blue-900 mt-1">{reportData[0].total_quantity}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-amber-900/50 to-slate-800 p-6 rounded-2xl border border-amber-500/20">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">💰</div>
                                            <div>
                                                <p className="text-slate-600 text-sm font-medium">Tổng tài sản (VNĐ)</p>
                                                <h3 className="text-2xl font-bold text-amber-400 mt-1">{new Intl.NumberFormat('vi-VN').format(reportData[0].total_value)} ₫</h3>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {stockValueChartData && (
                                    <div className="p-5 bg-white rounded-xl border border-blue-100">
                                        <h3 className="text-lg font-bold text-blue-900 mb-6 text-center">Tỷ trọng Giá trị tồn kho theo Sản phẩm</h3>
                                        <div className="h-80 flex justify-center"><Doughnut data={stockValueChartData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1' } } } }} /></div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                            <thead className="bg-blue-50/30 border-b border-blue-100">
                                <tr>
                                    {activeTab === 'inventory' && (
                                        <>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Sản phẩm</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Mã SKU</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">SL</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Giá trị</th>
                                        </>
                                    )}
                                    {activeTab === 'movements' && (
                                        <>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Ngày</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Sản phẩm</th>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Loại</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Thay đổi</th>
                                        </>
                                    )}
                                    {activeTab === 'stockValue' && (
                                        <>
                                            <th className="text-left py-4 px-6 text-sm font-medium text-slate-700 font-medium">Tên Kho</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Số loại sản phẩm</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Tổng SL</th>
                                            <th className="text-right py-4 px-6 text-sm font-medium text-slate-700 font-medium">Tổng giá trị</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.map((row, i) => (
                                    <tr key={i} className="border-b border-slate-100 hover:bg-blue-50 transition-colors">
                                        {activeTab === 'inventory' && (
                                            <>
                                                <td className="py-4 px-6 text-sm font-medium text-blue-900">{row.product_name}</td>
                                                <td className="py-4 px-6 text-sm text-blue-600 font-mono">{row.sku}</td>
                                                <td className="py-4 px-6 text-sm text-right text-blue-900">{row.quantity_on_hand}</td>
                                                <td className="py-4 px-6 text-sm text-right font-medium text-emerald-600 font-bold">{new Intl.NumberFormat('vi-VN').format(row.total_value)}</td>
                                            </>
                                        )}
                                        {activeTab === 'movements' && (
                                            <>
                                                <td className="py-4 px-6 text-sm text-slate-600">{row.date}</td>
                                                <td className="py-4 px-6 text-sm font-medium text-blue-900">{row.product_name}</td>
                                                <td className="py-4 px-6">
                                                    <span className={`badge ${row.quantity_change > 0 ? 'badge-success' : 'badge-danger'}`}>
                                                        {(!row.movement_type || row.movement_type.trim() === '') 
                                                            ? (row.quantity_change > 0 ? 'Nhập kho' : 'Xuất kho')
                                                            : row.movement_type.toLowerCase().includes('in') || row.movement_type.toLowerCase() === 'import' || row.movement_type.toLowerCase() === 'goods_receipt' 
                                                                ? 'Nhập kho' 
                                                                : row.movement_type.toLowerCase().includes('out') || row.movement_type.toLowerCase() === 'export' || row.movement_type.toLowerCase() === 'goods_issue'
                                                                    ? 'Xuất kho'
                                                                    : row.movement_type.replace(/_/g, ' ')
                                                        }
                                                    </span>
                                                </td>
                                                <td className={`py-4 px-6 text-sm text-right font-bold ${row.quantity_change > 0 ? 'text-emerald-600 font-bold' : 'text-red-400'}`}>
                                                    {row.quantity_change > 0 ? '+' : ''}{row.quantity_change}
                                                </td>
                                            </>
                                        )}
                                        {activeTab === 'stockValue' && (
                                            <>
                                                <td className="py-4 px-6 text-sm font-medium text-blue-900">{row.warehouse_name}</td>
                                                <td className="py-4 px-6 text-sm text-right text-slate-700 font-medium">{row.product_count}</td>
                                                <td className="py-4 px-6 text-sm text-right text-slate-700 font-medium">{row.total_quantity}</td>
                                                <td className="py-4 px-6 text-sm text-right font-bold text-blue-600">{new Intl.NumberFormat('vi-VN').format(row.total_value)}</td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
