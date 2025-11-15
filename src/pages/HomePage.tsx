import React, { useState } from "react";
import { SearchInput } from "../components/SearchInput"; // RELATIVE PATH (GitHub için doğru)

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    alert(`Searching for: ${searchQuery}`);
    // Burada backend veya filtreleme ekleyebilirsin
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Home Page</h1>

      <div className="flex gap-2 mt-4">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search products..."
        />

        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default HomePage;
