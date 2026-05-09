import React, { useState } from "react";
import axios from "axios";

// ================= INTERFACES =================
interface TransferItem {
    id: number;
    sku: string;
    product_name: string;
    quantity_requested: number;
    unit_cost: number;
}

interface Transfer {
    id: number;
    transfer_number: string;
    transfer_type: "IMPORT" | "EXPORT" | "TRANSFER";
    status: string;
    total_quantity: number;
    total_value: number;
    transfer_date: string;
    reason: string | null;
    delivery_person: string | null;
    storekeeper: string | null;
    receiver_name: string | null;
    receiver_department: string | null;
    receiver_address?: string;
    created_at: string;
    approved_at: string | null;
    order_id: number;
    receiver_phone: string | null;

    created_by_name?: string;
    approved_by_name?: string;

    items?: TransferItem[];
}

// ================= PROPS =================
interface Props {
    orderId: number;
    userId: number;
    orderDate: string;
}

// ================= COMPONENT =================
const ExportTransferViewer: React.FC<Props> = ({ orderId }) => {
    const [data, setData] = useState<Transfer | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleClick = async () => {
        try {
            setLoading(true);

            const res = await axios.get(`/api/transfers/by-order/${orderId}`);
            const transfer = res.data;
            console.log("API RES:", res.data);

            if (!transfer) {
                alert("Phiếu chưa được tạo, vui lòng chờ...");
                return;
            }

            if (transfer.transfer_type !== "EXPORT") {
                alert("Đây không phải phiếu xuất");
                return;
            }

            setData(transfer);
            setOpen(true);
        } catch (err) {
            console.error(err);
            alert("Không lấy được phiếu xuất");
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "approved":
                return "bg-green-100 text-green-600";
            case "pending":
                return "bg-yellow-100 text-yellow-600";
            case "cancelled":
            case "rejected":
                return "bg-red-100 text-red-600";
            default:
                return "bg-gray-100 text-gray-600";
        }
    };
    const getStatusLabel = (status: string) => {
        switch (status) {
            case "approved":
                return "Đã duyệt";
            case "pending":
                return "Chờ duyệt";
            case "cancelled":
            case "rejected":
                return "Bị từ chối";
            default:
                return status;
        }
    };

    return (
        <>
            {/* BUTTON */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                }}
                disabled={loading}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold 
                           bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
                {loading ? "..." : "📦 Phiếu xuất"}
            </button>

            {/* MODAL */}
            {open && data && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white w-[900px] rounded-xl shadow-xl p-6 relative">

                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-lg font-semibold">
                                Phiếu: {data.transfer_number}
                            </h2>

                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-600">
                                    Xuất kho
                                </span>

                                <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusStyle(data.status)}`}>
                                    {getStatusLabel(data.status)}
                                </span>

                                <button
                                    onClick={() => setOpen(false)}
                                    className="ml-2 text-gray-400 hover:text-black"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* 2 CARD */}
                        <div className="grid grid-cols-2 gap-4 mb-5">

                            {/* THÔNG TIN CHUNG */}
                            <div className="border rounded-lg p-4 text-sm bg-gray-50">
                                <h3 className="font-semibold mb-3">📄 Thông tin chung</h3>

                                <div className="space-y-1">
                                    <p><span className="text-gray-500">Kho xuất:</span> Kho Tổng</p>
                                    <p><span className="text-gray-500">Địa chỉ:</span> Trịnh Văn Bô, Hà Nội</p>
                                    <p><span className="text-gray-500">Ngày tạo:</span> {new Date(data.created_at).toLocaleDateString()}</p>
                                    <p><span className="text-gray-500">Mã đơn:</span> #{data.order_id}</p>
                                    <p><span className="text-gray-500">Ghi chú:</span> {data.reason || "-"}</p>
                                </div>

                                <div className="mt-3 pt-3 border-t">
                                    <p className="text-gray-500">Tổng giá trị:</p>
                                    <p className="text-green-600 font-semibold text-lg">
                                        {Number(data.total_value).toLocaleString()} đ
                                    </p>
                                </div>
                            </div>

                            {/* NGHIỆP VỤ */}
                            <div className="border rounded-lg p-4 text-sm bg-gray-50">
                                <h3 className="font-semibold mb-3">📋 Thông tin nghiệp vụ</h3>

                                <div className="space-y-1">
                                    <p><span className="text-gray-500">Người giao:</span> {data.delivery_person || "-"}</p>
                                    <p><span className="text-gray-500">Người lập:</span> {data.created_by_name || "-"}</p>
                                    <p><span className="text-gray-500">Thủ kho:</span> {data.storekeeper || "-"}</p>
                                    <p><span className="text-gray-500">Người duyệt:</span> {data.approved_by_name || "-"}</p>

                                    <p className="pt-2 border-t">
                                        <span className="text-gray-500">Người nhận:</span> {data.receiver_name || "-"}
                                    </p>
                                    <p><span className="text-gray-500">SĐT:</span> {data.receiver_phone || "-"}</p>
                                    <p><span className="text-gray-500">Địa chỉ:</span> {data.receiver_address || "-"}</p>
                                </div>
                            </div>
                        </div>

                        {/* ITEMS */}
                        <div className="border rounded-lg overflow-hidden">
                            <div className="px-4 py-2 border-b font-medium text-sm bg-gray-50">
                                📦 Danh sách sản phẩm
                            </div>

                            <table className="w-full text-sm">
                                <thead className="bg-gray-100 text-gray-500">
                                    <tr>
                                        <th className="text-left px-4 py-2">SKU</th>
                                        <th className="text-left px-4 py-2">Tên SP</th>
                                        <th className="text-center px-4 py-2">SL</th>
                                        <th className="text-right px-4 py-2">Đơn giá</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data.items && data.items.length > 0 ? (
                                        data.items.map((item) => (
                                            <tr key={item.id} className="border-t hover:bg-gray-50">
                                                <td className="px-4 py-2 text-gray-500 font-mono">{item.sku}</td>
                                                <td className="px-4 py-2">{item.product_name}</td>
                                                <td className="px-4 py-2 text-center font-medium">{item.quantity_requested}</td>
                                                <td className="px-4 py-2 text-right text-green-600 font-semibold">
                                                    {Number(item.unit_cost).toLocaleString()} đ
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="text-center py-4 text-gray-400">
                                                Không có sản phẩm
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER */}
                        <div className="flex justify-end mt-5">
                            <button
                                onClick={() => setOpen(false)}
                                className="px-4 py-1.5 rounded bg-gray-100 hover:bg-gray-200"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ExportTransferViewer;