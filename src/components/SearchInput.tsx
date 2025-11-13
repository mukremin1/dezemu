import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange }) => {
  return (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
      <Input
        type="text"
        placeholder="Ürün ara…"
        value={value}
        onChange={onChange}
        className="pl-10 h-10"
      />
    </div>
  );
};
