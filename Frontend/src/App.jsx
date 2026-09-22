import React, { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Login from "./General/login";
import Sidebar from "./Sidebar";
import CreateBillSteps from "./General/steps";
import Inventory from "./Pages/Inventory";
import CollectPayment from "./CollectPayments/index";

function App() {
  const { pathname } = useLocation();
  const [userId, setUserId] = useState(null);
  const showSidebar = pathname !== "/";
  const [toast, setToast] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (toast) {
      setTimeout(() => setToast(null), 2200);
    }
  }, [toast]);

  return (
    <div className="flex h-full w-full">
      {showSidebar && <Sidebar setCurrentStep={setCurrentStep} />}

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
