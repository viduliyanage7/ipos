import { useState, useEffect } from "react";
import { MagnifyingGlass, UserPlus, Phone, X } from "@phosphor-icons/react";
import axios from "axios";
import CustomerRegistration from "./modals/CustomerRegistration";
import CustomerVerification from "./modals/CustomerVerification";

const CustomerSearch = (props) => {
  const { nextStep, setCustomer } = props;

  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [regModal, setRegModal] = useState(null);
  const [otpModal, setOtpModal] = useState(null);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  const handleSearch = async () => {
    if (!/^\d{10}$/.test(phone)) {
      showError("Phone number must contain exactly 10 digits.");
      return;
    }
    try {
      const response = await axios.post(
        "http://localhost:3002/api/create-bill/customer-search",
        { ph_number: phone },
      );
      if (response.data.data) {
        setCustomer(response.data.data);
        if (response.data.data.is_verified === 0) {
          setOtpModal(true);
        } else {
          nextStep();
        }
      } else {
        setRegModal(true);
      }
    } catch (error) {
      setRegModal(true);
    }
  };

  const handleVerification = () => {
    setRegModal(false);
    setOtpModal(true);
  };

  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-50">
      {regModal && (
        <CustomerRegistration
          phone={phone}
          setPhone={setPhone}
          setCustomer={setCustomer}
          setRegModal={setRegModal}
          handleVerification={handleVerification}
        />
      )}

      {otpModal && (
        <CustomerVerification
          phone={phone}
          nextStep={nextStep}
          setOtpModal={setOtpModal}
        />
      )}

      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
          <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl mb-6">
            <Phone size={22} weight="duotone" className="text-emerald-600" />
          </div>

          <h1 className="text-lg font-semibold text-gray-800 mb-1">
            Find customer
          </h1>
          <p className="text-sm text-gray-400 mb-6">
            Enter a phone number to look up an existing customer.
          </p>

          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            Phone number
          </label>
          <input
            type="tel"
            placeholder="e.g. 0771234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full h-11 px-4 rounded-lg border border-gray-200 text-sm text-gray-800
                       placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500
                       focus:border-transparent transition"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full mt-4 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60
                       text-white text-sm font-medium rounded-lg flex items-center justify-center
                       gap-2 transition-colors duration-150"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <MagnifyingGlass size={16} weight="bold" />
            )}
            {loading ? "Searching..." : "Search customer"}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={() => setRegModal(true)}
            className="w-full h-11 border border-gray-200 hover:bg-gray-50 text-gray-600
                       hover:text-gray-800 text-sm rounded-lg flex items-center justify-center
                       gap-2 transition-colors duration-150"
          >
            <UserPlus size={16} />
            Register new customer
          </button>

          <div className="h-10 pt-3">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
                <X size={14} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Can't find a customer? Register them as new.
        </p>
      </div>
    </div>
  );
};

export default CustomerSearch;
