
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { orderService, OrderSummary } from "../../services/orderService";

const StaffDonHang = () => {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await orderService.getStaffOrders();
      setOrders(res.data);
    } catch (error) {
      console.error("Lỗi lấy đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Đang tải đơn hàng...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">

      {/* Header giống CreateTransfer */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">

          <Link
            to="/staff/dashboard"
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md hover:shadow-lg border border-slate-200"
          >
            ←
          </Link>

          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🛒</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Danh sách đơn hàng
            </h1>
            <p className="text-slate-500">
              Staff có thể xem tất cả đơn hàng
            </p>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">

        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">
              📦
            </span>
            Danh sách đơn
          </h2>
        </div>

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Khách hàng</th>
                <th className="p-4 text-left">SĐT</th>
                <th className="p-4 text-left">Địa chỉ</th>
                <th className="p-4 text-left">Tổng tiền</th>
                <th className="p-4 text-left">Trạng thái</th>
                <th className="p-4 text-left">Thanh toán</th>
                <th className="p-4 text-left">Ngày tạo</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const status = orderService.getStatusInfo(order.status);
                const payment = orderService.getPaymentStatusInfo(order.payment_status);

                return (
                  <tr
                    key={order.id}
                    className="border-t hover:bg-slate-50 transition"
                  >
                    <td className="p-4 font-semibold text-indigo-600">
                      #{order.id}
                    </td>

                    <td className="p-4">
                      {order.shipping_name}
                    </td>

                    <td className="p-4">
                      {order.shipping_phone}
                    </td>

                    <td className="p-4">
                      {order.shipping_address}
                    </td>

                    <td className="p-4 font-semibold text-green-600">
                      {orderService.formatCurrency(order.total_amount)}
                    </td>

                    <td className="p-4">
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-semibold"
                        style={{ color: status.color }}
                      >
                        {status.text}
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-semibold"
                        style={{ color: payment.color }}
                      >
                        {payment.text}
                      </span>
                    </td>

                    <td className="p-4 text-slate-500">
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>

        </div>
      </div>
    </div>
  );
};

export default StaffDonHang;

