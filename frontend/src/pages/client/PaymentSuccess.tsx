// import { useEffect } from "react";
// import { useLocation, useNavigate } from "react-router-dom";
// import axios from "axios";

// const PaymentSuccess = () => {

//   const location = useLocation();
//   const navigate = useNavigate();

//   useEffect(() => {

//     const params = new URLSearchParams(location.search);
//     const orderId = params.get("orderId");

//     if (orderId) {

//       axios.post(`/api/orders/${orderId}/payment-success`)
//         .then(() => {
       
//           navigate("/client/cart");
//         });

//     }

//   }, []);

//   return <h2>Đang xác nhận thanh toán...</h2>;
// };

// export default PaymentSuccess;