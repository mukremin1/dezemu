import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@components/Header";
import HomePage from "@pages/HomePage";
import OrdersPage from "@pages/OrdersPage";

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <Router>
      <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Routes>
        <Route path="/" element={<HomePage searchQuery={searchQuery} />} />
        <Route path="/orders" element={<OrdersPage />} />
      </Routes>
    </Router>
  );
};

export default App;
