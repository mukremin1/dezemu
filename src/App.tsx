import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Header } from "./Header";
import { useEffect, useState } from "react";
import { SearchPage } from "./pages/SearchPage";

// Utility hook to parse query params
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

// Search page
export const SearchPage = () => {
  const query = useQuery();
  const q = query.get("q") || "";
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (q) {
      setResults([`Sonuç 1 için "${q}"`, `Sonuç 2 için "${q}"`]);
    } else {
      setResults([]);
    }
  }, [q]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Arama Sonuçları: "{q}"</h2>
      <ul>
        {results.map((res, idx) => (
          <li key={idx}>{res}</li>
        ))}
      </ul>
    </div>
  );
};

// Ana sayfa
export const HomePage = () => <div className="p-4">Ana Sayfa</div>;

// App component
export const App = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/search" element={<SearchPage />} />
        {/* Diğer sayfalar */}
      </Routes>
    </Router>
  );
};
