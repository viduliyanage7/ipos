import React, { useEffect, useState, useRef } from "react";
import axios from "axios";

const Products = (props) => {
  const { setCart, cart, nextStep, setToast } = props;
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [modalQty, setModalQty] = useState(1);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (modal && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [modal]);

  const fetchData = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3002/api/create-bill/products",
      );
      setCategories(response.data.data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const allProducts = categories.flatMap((cat) => {
    const ids = cat.productIds.split(",");
    const names = cat.productNames.split(",");
    const stocks = cat.productStock ? cat.productStock.split(",") : [];

    return names.map((name, idx) => ({
      id: `${ids[idx]}`,
      productName: name.trim(),
      category_id: cat.category_id,
      category_name: cat.category_name,
      stock: parseInt(stocks[idx]) || 0,
      price: undefined,
    }));
  });

  const filtered = allProducts.filter((p) =>
    p.productName.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = filtered.reduce((acc, product) => {
    if (!acc[product.category_name]) acc[product.category_name] = [];
    acc[product.category_name].push(product);
    return acc;
  }, {});

  const openModal = (product) => {
    setModal({ product });
    setModalQty(1);
  };
  const closeModal = () => {
    setModal(null);
    setModalQty(1);
  };

  const confirmAdd = async () => {
    if (!modal) return;
    const { product } = modal;
    const qty = Math.max(1, parseInt(modalQty) || 1);

    const existingQty = cart.find((c) => c.id === product.id)?.qty || 0;
    const newQty = existingQty + qty;
    const price = await handleCalculatePrice(product.id, newQty);
    if (existingQty + qty > product.stock) {
      showToast(`Only ${product.stock} in stock`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing)
        return prev.map((c) =>
          c.id === product.id ? { ...c, qty: c.qty + qty, price } : c,
        );
      return [...prev, { ...product, qty, price }];
    });
    showToast(`${product.productName} × ${qty} added`);
    closeModal();
  };

  const handleModalKeyDown = (e) => {
    if (e.key === "Enter") confirmAdd();
    if (e.key === "Escape") closeModal();
  };

  const isInCart = (id) => cart.some((c) => c.id === id);
  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((c) => c.id !== id));

  const handleProductClick = (product) => {
    openModal(product);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const checkout = () => {
    if (cart.length === 0) return;
    nextStep();
    setCartOpen(false);
  };

  const cartTotal = cart.reduce((s, c) => s + (c.price || 0) * c.qty, 0);

  const handleCalculatePrice = async (productId, quantity) => {
    try {
      const response = await axios.get(
        "http://localhost:3002/api/create-bill/product_price",
        {
          params: { pid: productId, qty: quantity },
        },
      );
      return response.data.data.price;
    } catch (error) {
      console.error("Failed to fetch product price:", error);
      return undefined;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <svg
            className="w-5 h-5 text-slate-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          <span className="font-semibold text-slate-900 text-base">
            Products
          </span>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19a2 2 0 001.99-1.73L22 6H6" />
          </svg>
          Cart
          {cart.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-semibold rounded-full px-1.5 py-px min-w-[20px] text-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      <div></div>

      <div className="px-6 pt-4 pb-3 max-w">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition"
          />
        </div>
      </div>

      <div className="px-6 pb-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1 gap-3.5 items-start">
        {Object.entries(grouped).length === 0 ? (
          <div className="col-span-full text-center text-slate-400 text-sm pt-12">
            No products found.
          </div>
        ) : (
          Object.entries(grouped).map(([catName, products]) => (
            <div
              key={catName}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                {catName}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {products.map((product) => {
                  const selected = isInCart(product.id);
                  const lowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all cursor-pointer
                        ${
                          selected
                            ? "bg-slate-900 text-white border border-slate-900"
                            : "bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                    >
                      {selected && (
                        <svg
                          className="w-2.5 h-2.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                      {product.productName}
                      {lowStock && (
                        <span className="ml-1 text-[12px] text-[#ff0000] font-semibold">
                          {product.stock} left
                        </span>
                      )}
                      {!lowStock && (
                        <span className="ml-1 text-[10px] text-amber-500 font-semibold">
                          {product.stock} left
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <>
          <div
            onClick={closeModal}
            className="fixed inset-0 bg-black/45 z-[200]"
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl w-80 z-[201] overflow-hidden shadow-2xl">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {modal.product.productName}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modal.product.category_name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {modal.product.stock} in stock
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer text-base border-none"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs font-medium text-slate-500 mb-2.5">
                Quantity
              </p>

              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50 mb-4">
                <button
                  onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                  className="flex-1 h-12 flex items-center justify-center text-xl text-slate-500 border-r border-slate-200 bg-transparent hover:bg-slate-100 transition cursor-pointer border-none"
                >
                  −
                </button>
                <input
                  ref={inputRef}
                  type="number"
                  value={modalQty}
                  min={1}
                  max={modal.product.stock}
                  onChange={(e) =>
                    setModalQty(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  onKeyDown={handleModalKeyDown}
                  className="w-[200px] flex-[2] h-12 text-center text-xl font-bold text-slate-900 bg-white border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() =>
                    setModalQty((q) => Math.min(modal.product.stock, q + 1))
                  }
                  className="flex-1 h-12 flex items-center justify-center text-xl text-slate-500 border-l border-slate-200 bg-transparent hover:bg-slate-100 transition cursor-pointer border-none"
                >
                  +
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAdd}
                  className="flex-[2] py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-800 transition cursor-pointer border-none"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19a2 2 0 001.99-1.73L22 6H6" />
                  </svg>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {cartOpen && (
        <div
          onClick={() => setCartOpen(false)}
          className="fixed inset-0 bg-black/30 z-[100]"
        />
      )}

      <div
        className={`fixed top-0 right-0 bottom-0 w-80 bg-white border-l border-slate-200 flex flex-col z-[101] transition-transform duration-200 ease-in-out ${cartOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-slate-900 text-base">
            Cart ({cart.length})
          </span>
          <button
            onClick={() => setCartOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 text-slate-500 hover:bg-slate-200 transition cursor-pointer text-base border-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2">
          {cart.length === 0 ? (
            <div className="text-center text-slate-400 text-sm pt-8">
              <svg
                className="w-8 h-8 mx-auto mb-2 opacity-40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61H19a2 2 0 001.99-1.73L22 6H6" />
              </svg>
              Cart is empty
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2.5 p-2.5 border border-slate-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex gap-1 text-sm font-semibold text-slate-900 truncate">
                    <p>{item.productName}</p>
                    <p>× {item.qty}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.category_name} ({item.price})
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition text-base border-none bg-transparent cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200">
          {cartTotal > 0 && (
            <div className="flex justify-between text-sm font-semibold text-slate-900 mb-3">
              <span>Total</span>
              <span>{cartTotal.toFixed(2)}</span>
            </div>
          )}
          <button
            onClick={checkout}
            disabled={cart.length === 0}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition border-none
              ${
                cart.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
              }`}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Products;
