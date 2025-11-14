import React, { useState } from "react";
import { SearchInput } from "../components/SearchInput"; // Web üzerinden relative path

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    alert(`Searching for: ${searchQuery}`);
  };

  return (
    <div className="p-4">
      <h1>Home Page</h1>
      <div className="flex gap-2 mt-2">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default HomePage;
