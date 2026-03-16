import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const PaymentCancel = () => {

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {

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