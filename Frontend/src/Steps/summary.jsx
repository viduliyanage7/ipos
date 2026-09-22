import React from "react";
import axios from "axios";

const Summary = (props) => {
  const { setToast, cart, customer, userId, nextStep } = props;

  const total =
    cart.length > 0
      ? cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0)
      : 0;
  const itemCount =
    cart.length > 0 ? cart.reduce((sum, item) => sum + item.qty, 0) : 0;

  const SaveBill = async () => {
    const response = await axios.post(
      "http://localhost:3002/api/create-bill/generate-bill",
      {
        c_id: customer.id,
        items: cart,
        user_id: userId,
        total: total.toFixed(2),
      },
    );
    if (response.data.billId > 0) {
      setToast("Bill saved successfully!");
      nextStep();
    } else {
      setToast("Failed to save bill!");
    }
  };
  return (
    <div>
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
          onClick={() => SaveBill()}
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
          Save Bill
        </button>
      </div>
      <div className=" bg-gray-50 flex justify-center px-4 py-10 font-mono">
        <div className="pt-10 w-full max-w-[420px] bg-white text-[#1c1a17] px-7 pb-6 shadow-[0_12px_32px_rgba(28,26,23,0.18)]">
          <div className="text-center pt-5 pb-1">
            <span className="block text-[11px] tracking-[0.18em] uppercase text-[#7a7466]">
              Bill Preview
            </span>
            <h1 className="font-serif text-2xl font-bold mt-1 tracking-tight">
              Order Summary
            </h1>
          </div>

          <Divider />

          <section>
            <h2 className="text-[11px] tracking-[0.16em] uppercase text-[#7a7466] font-bold mb-2.5">
              Customer
            </h2>
            <Row label="Name" value={customer.name} />
            <Row label="Phone" value={customer.phone_number} />
            <Row label="Vehicle No" value={customer.vehicle_no} mono />
            <Row label="Location" value={customer.location} />
            <Row label="Type" value={customer.customer_type} />
            <div className="flex justify-between items-baseline py-1 text-[13.5px]">
              <span className="text-[#7a7466]">Verified</span>
              <span
                className={`text-[11px] tracking-wide uppercase font-bold px-2.5 py-[3px] rounded-sm ${
                  customer.is_verified
                    ? "text-[#c97a2b] bg-[#f3e4d2]"
                    : "text-[#7a7466] bg-[#f1ecdf]"
                }`}
              >
                {customer.is_verified ? "Verified" : "Unverified"}
              </span>
            </div>
          </section>

          <Divider />

          <section>
            <div className="flex text-[10.5px] tracking-wide uppercase text-[#7a7466] border-b border-[#c9c2b4] pb-1.5 mb-1">
              <span className="flex-[2]">Item</span>
              <span className="w-9 text-right">Qty</span>
              <span className="w-16 text-right">Price</span>
              <span className="w-[76px] text-right">Amount</span>
            </div>

            {cart.length === 0 ? (
              <p className="text-[13px] text-[#7a7466] italic py-2.5">
                No items added yet.
              </p>
            ) : (
              cart.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start py-2 border-b border-dashed border-[#c9c2b4] text-[13px]"
                >
                  <div className="flex-[2] flex flex-col pr-1.5">
                    <span className="font-bold">{item.productName}</span>
                    <span className="text-[11px] text-[#7a7466] mt-0.5">
                      {item.category_name}
                    </span>
                  </div>
                  <span className="w-9 text-right">{item.qty}</span>
                  <span className="w-16 text-right">
                    {Number(item.price).toFixed(2)}
                  </span>
                  <span className="w-[76px] text-right font-bold">
                    {Number(Number(item.price) * item.qty).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </section>

          <Divider thick />

          <div className="flex justify-between items-baseline py-1.5 pb-3.5">
            <span className="text-sm font-bold tracking-wide uppercase">
              Total Due
            </span>
            <span className="text-2xl font-bold text-[#c97a2b]">
              {total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between items-baseline py-1 text-[13.5px]">
    <span className="text-[#7a7466]">{label}</span>
    <span
      className={`font-semibold text-right max-w-[65%] ${mono ? "tracking-wider" : ""}`}
    >
      {value || "—"}
    </span>
  </div>
);

const Divider = ({ thick }) => (
  <div
    className={
      thick
        ? "border-t-2 border-[#1c1a17] my-3.5"
        : "border-t border-dashed border-[#c9c2b4] my-3.5"
    }
  />
);

export default Summary;
