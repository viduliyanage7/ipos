import React, { useState } from "react";
import { UserPlus, X, User, Phone, Car, MapPin } from "@phosphor-icons/react";
import axios from "axios";

const CustomerRegistration = (props) => {
  const { setCustomer, setRegModal, phone, setPhone, handleVerification } =
    props;
  const [name, setName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim()) {
      showError("Name and phone number are required");
      return;
    }
    const cleanPhone = phone.trim();

    if (!/^\d{10}$/.test(cleanPhone)) {
      showError("Phone number must contain exactly 10 digits.");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        "http://localhost:3002/api/create-bill/customer-registration",
        { phone, name, vehicleNo, location },
      );
      if (response.data.status === "Success") {
        setCustomer(response.data.data);
        handleVerification();
      } else {
        showError(response.data.message || "Registration failed");
      }
    } catch (err) {
      showError(
        err.response?.data?.message ||
          "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 relative shadow-xl">
        <button
          onClick={() => setRegModal(false)}
          className="absolute top-5 right-5 text-black hover:text-gray-500 transition-colors"
        >
          <X size={20} weight="bold" />
        </button>

        <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl mb-6">
          <UserPlus size={22} weight="duotone" className="text-emerald-600" />
        </div>

        <h1 className="text-lg font-semibold text-gray-800 mb-1">
          Register customer
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          Add a new customer's details to create a bill.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
              />
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 text-sm text-gray-800
                           placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Phone number
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
              />
              <input
                type="tel"
                placeholder="e.g. 0771234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 text-sm text-gray-800
                           placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Vehicle number
            </label>
            <div className="relative">
              <Car
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
              />
              <input
                type="text"
                placeholder="e.g. ABC123"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 text-sm text-gray-800
                           placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:border-transparent transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Location
            </label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300"
              />
              <input
                type="text"
                placeholder="e.g. Colombo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 text-sm text-gray-800
                           placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:border-transparent transition"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
            <X size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full mt-6 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60
                     text-white text-sm font-medium rounded-lg flex items-center justify-center
                     gap-2 transition-colors duration-150"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <UserPlus size={16} weight="bold" />
          )}
          {loading ? "Registering..." : "Register customer"}
        </button>
      </div>
    </div>
  );
};

export default CustomerRegistration;
