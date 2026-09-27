import React, { useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "./General/login";
import Sidebar from "./Sidebar";
import CreateBillSteps from "./General/steps";
import Inventory from "./Pages/Inventory";
import CollectPayment from "./CollectPayments/index";

const USER_ID_STORAGE_KEY = "userId";

// Reads the persisted userId once, synchronously, so the very first render
// already has it (avoids a flash of "logged out" before an effect runs).
function readStoredUserId() {
  try {
    return localStorage.getItem(USER_ID_STORAGE_KEY) || null;
  } catch (err) {
    // localStorage can throw in private-browsing/blocked-storage modes.
    console.error("Could not read persisted userId", err);
    return null;
  }
}

function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [userId, setUserIdState] = useState(readStoredUserId);
  const showSidebar = pathname !== "/";
  const [toast, setToast] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  // Wraps setUserId so every place that logs the user in/out automatically
  // keeps localStorage in sync — this is what survives the tab being
  // reloaded after the browser discards it during idle/sleep.
  const setUserId = (id) => {
    setUserIdState(id);
    try {
      if (id) {
        localStorage.setItem(USER_ID_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(USER_ID_STORAGE_KEY);
      }
    } catch (err) {
      console.error("Could not persist userId", err);
    }
  };

  const logout = () => {
    setUserId(null);
    navigate("/");
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2200);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="flex h-full w-full">
      {showSidebar && (
        <Sidebar setCurrentStep={setCurrentStep} onLogout={logout} />
      )}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Login setUserId={setUserId} />} />
          <Route
            path="/create-bill"
            element={
              <CreateBillSteps
                userId={userId}
                setToast={setToast}
                currentStep={currentStep}
                setCurrentStep={setCurrentStep}
              />
            }
          />
          <Route
            path="/collect-payment"
            element={<CollectPayment userId={userId} />}
          />
          <Route
            path="/inventory"
            element={<Inventory setToast={setToast} />}
          />
        </Routes>
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-4 py-2 rounded-lg z-[300] whitespace-nowrap shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
