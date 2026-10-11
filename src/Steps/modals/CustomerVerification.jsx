import React, { useState, useRef, useEffect } from "react";
import { ShieldCheck, X, ArrowLeft } from "@phosphor-icons/react";
import axios from "axios";

const CustomerVerification = (props) => {
  const { phone, nextStep, prevStep, setCustomer, setOtpModal } = props;
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 3000);
  };

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").trim();
    if (!/^\d{6}$/.test(pasted)) return;
    e.preventDefault();
    setOtp(pasted.split(""));
    inputRefs.current[5]?.focus();
  };

  const sendingRef = useRef(false);

  const handleSendOTP = async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      await axios.post("https://shop.liyontatea.com/api/send-otp", {
        phone,
      });
      setResendTimer(30);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      showError("Could not send OTP. Please try again.");
    } finally {
      sendingRef.current = false;
    }
  };

  const handleResend = async () => {
    if (sendingRef.current) return;
    setResending(true);
    try {
      await handleSendOTP();
    } catch (err) {
      showError("Could not resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  useEffect(() => {
    handleSendOTP();
  }, [phone]);

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      showError("Please enter the full 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        "https://shop.liyontatea.com/api/verify-otp",
        {
          phone,
          otp: code,
        },
      );
      if (response.data.status === "Success") {
        setCustomer?.(response.data.data);
        await axios.post(
          "http://localhost:3002/api/customer/update-verification-status",
          {
            phone,
          },
        );
        setOtpModal(false);
        nextStep?.();
      } else {
        showError(response.data.message || "Invalid code, please try again");
      }
    } catch (err) {
      showError(
        err.response?.data?.message || "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setOtpModal(false);
    nextStep();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 relative shadow-xl">
        {prevStep && (
          <button
            onClick={prevStep}
            className="absolute top-6 left-6 text-gray-300 hover:text-gray-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl mb-6 mx-auto">
          <ShieldCheck
            size={22}
            weight="duotone"
            className="text-emerald-600"
          />
        </div>

        <h1 className="text-lg font-semibold text-gray-800 mb-1 text-center">
          Verify code
        </h1>
        <p className="text-sm text-gray-400 mb-6 text-center">
          Enter the 6-digit code sent to{" "}
          <span className="text-gray-600 font-medium">
            {phone || "your phone"}
          </span>
        </p>

        <div
          className="flex items-center justify-center gap-2.5"
          onPaste={handlePaste}
        >
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-11 h-12 text-center text-lg font-semibold rounded-lg border border-gray-200
                           text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500
                           focus:border-transparent transition"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
            <X size={14} className="text-red-400 shrink-0" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full mt-6 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60
                       text-white text-sm font-medium rounded-lg flex items-center justify-center
                       gap-2 transition-colors duration-150"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <ShieldCheck size={16} weight="bold" />
          )}
          {loading ? "Verifying..." : "Verify code"}
        </button>

        <p className="text-center text-xs text-gray-400 mt-5">
          {resendTimer > 0 ? (
            <>
              Resend code in{" "}
              <span className="text-gray-600 font-medium">{resendTimer}s</span>
            </>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-60"
            >
              {resending ? "Sending..." : "Didn't get a code? Resend"}
            </button>
          )}
        </p>
        <button
          onClick={handleSkip}
          className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors underline underline-offset-2"
        >
          Continue without verifying
        </button>
      </div>
    </div>
  );
};

export default CustomerVerification;
