// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import  Header  from "@/components/Header";
import { SearchPage } from "@/pages/SearchPage";
import HomePage from "@/pages/HomePage";

export const App = () => {
  return (
    <Router basename="/dezemu">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="*" element={
          <div className="container py-20 text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">404 - Sayfa Bulunamadı</h1>
            <a href="/dezemu/" className="text-primary hover:underline">Ana sayfaya dön</a>
          </div>
        } />
      </Routes>
    </Router>
  );
};
