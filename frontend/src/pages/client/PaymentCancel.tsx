import axios from "axios";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PaymentCancel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const params = new URLSearchParams(location.search);
    const orderId = params.get("orderId");

    if (orderId) {
      axios.delete(`/api/orders/${orderId}/cancel-payment`)
        .then(() => {
          navigate("/client/cart");
        });
    }
  }, []);

  return <h2>Thanh toán đã bị hủy...</h2>;
};

export default PaymentCancel;