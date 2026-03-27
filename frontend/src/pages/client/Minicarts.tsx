// import React, { useEffect, useState } from 'react';
// import { cartService, CartItem } from '../../services/cartService';
// import { uploadService } from '../../services/uploadService';
// import { useAuth } from '../../context/AuthContext';

// interface CartItemWithId extends CartItem {
//     api_id?: number;
// }

// const MiniCart: React.FC = () => {
//     const { isAuthenticated } = useAuth();
//     const [cart, setCart] = useState<CartItemWithId[]>([]);
//     const [loading, setLoading] = useState(false);

//     const loadCart = async () => {
//         setLoading(true);
//         try {
//             let items: CartItemWithId[] = [];

//             if (isAuthenticated) {
//                 try {
//                     const res = await cartService.getCartAPI();
//                     items = res.items.map(i => ({
//                         ...i,
//                         api_id: (i as any).id
//                     }));
//                 } catch {
//                     items = cartService.getCart();
//                 }
//             } else {
//                 items = cartService.getCart();
//             }

//             setCart(items);
//         } catch (err) {
//             console.error(err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         loadCart();

//         const handleUpdate = () => loadCart();
//         window.addEventListener("cartUpdated", handleUpdate);

//         return () => {
//             window.removeEventListener("cartUpdated", handleUpdate);
//         };
//     }, [isAuthenticated]);

//     const updateQty = async (item: CartItemWithId, newQty: number) => {
//         if (newQty < 1) return;

//         if (isAuthenticated && item.api_id) {
//             await cartService.updateCartItemAPI(item.api_id, newQty);
//         } else {
//             cartService.updateQuantity(item.product_id, item.variant_id, newQty);
//         }

//         window.dispatchEvent(new Event("cartUpdated"));
//     };

//     const removeItem = async (item: CartItemWithId) => {
//         if (isAuthenticated && item.api_id) {
//             await cartService.removeCartItemAPI(item.api_id);
//         } else {
//             cartService.removeFromCart(item.product_id, item.variant_id);
//         }

//         window.dispatchEvent(new Event("cartUpdated"));
//     };

//     const formatPrice = (price: number) =>
//         new Intl.NumberFormat('vi-VN').format(price) + '₫';

//     const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

//     return (
//         <div className="fixed right-4 top-1/2 -translate-y-1/2 h-[40vh] w-80 bg-white shadow-xl border border-slate-200 rounded-xl z-50 flex flex-col">

//             {/* HEADER */}
//             <div className="p-3 border-b font-semibold text-md flex justify-between">
//                 🛒 Hàng bạn muốn nhập 
//             </div>

//             {/* BODY */}
//             <div className="flex-1 overflow-y-auto p-2 space-y-2">
//                 {loading ? (
//                     <div>Loading...</div>
//                 ) : cart.length === 0 ? (
//                     <div className="text-center text-slate-500 mt-5">
//                         Hãy chọn sản phẩm bạn muốn nhập
//                     </div>
//                 ) : (
//                     cart.map(item => (
//                         <div
//                             key={cartService.getItemKey(item.product_id, item.variant_id)}
//                             className="flex gap-2 border p-2 rounded-lg text-sm"
//                         >

//                             {/* IMAGE */}
//                             <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden">
//                                 {item.image_url ? (
//                                     <img
//                                         src={uploadService.getImageUrl(item.image_url)}
//                                         className="w-full h-full object-cover"
//                                     />
//                                 ) : "📦"}
//                             </div>

//                             {/* INFO */}
//                             <div className="flex-1">
//                                 {/* TÊN SẢN PHẨM */}
//                                 <div className="font-medium line-clamp-1">
//                                     {item.name}
//                                 </div>

//                                 {/* BIẾN THỂ (GIỐNG CART) */}
//                                 {item.variant_label && (
//                                     <p className="text-xs text-slate-500 mt-1">
//                                         Phân loại: <span className="font-medium">{item.variant_label}</span>
//                                     </p>
//                                 )}

//                                 {/* SKU (GIỐNG CART) */}
//                                 {item.sku && (
//                                     <p className="text-xs text-slate-400 mt-1 font-mono">
//                                         SKU: {item.sku}
//                                     </p>
//                                 )}

//                                 {/* GIÁ */}
//                                 <div className="text-xs text-slate-500 mt-1">
//                                     {formatPrice(item.price)}
//                                 </div>

//                                 {/* QUANTITY */}
//                                 <div className="flex items-center gap-1 mt-1">
//                                     <button
//                                         onClick={() => updateQty(item, item.quantity - 1)}
//                                         className="px-2 border rounded"
//                                     >-</button>

//                                     <span>{item.quantity}</span>

//                                     <button
//                                         onClick={() => updateQty(item, item.quantity + 1)}
//                                         className="px-2 border rounded"
//                                     >+</button>
//                                 </div>
//                             </div>

//                             {/* REMOVE */}
//                             <button
//                                 onClick={() => removeItem(item)}
//                                 className="text-red-500"
//                             >
//                                 🗑️
//                             </button>
//                         </div>
//                     ))
//                 )}
//             </div>

//             {/* FOOTER */}
//             <div className="p-3 border-t text-sm">
//                 <div className="flex justify-between font-semibold mb-2">
//                     <span>Tổng:</span>
//                     <span className="text-primary-600">{formatPrice(total)}</span>
//                 </div>

//                 <a
//                     href="/cart"
//                     className="block text-center bg-primary-600 text-white py-1.5 rounded text-sm"
//                 >
//                   Thanh toán hàng hóa 
//                 </a>
//             </div>
//         </div>
//     );
// };

// export default MiniCart;