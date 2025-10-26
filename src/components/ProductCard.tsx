import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/useCart";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  imageUrl?: string;
  slug: string;
  isDigital: boolean;
}

export const ProductCard = ({
  id,
  name,
  price,
  comparePrice,
  imageUrl,
  slug,
  isDigital,
}: ProductCardProps) => {
  const navigate = useNavigate();
  const addItem = useCart((state) => state.addItem);
  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({
      id,
      name,
      price,
      imageUrl,
      stock: 100, // We don't have stock info in the card, default to high number
      slug,
    });
  };

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      <div
        className="relative aspect-square overflow-hidden cursor-pointer"
        onClick={() => navigate(`/product/${slug}`)}
      >
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
            -{discount}%
          </Badge>
        )}
        {isDigital && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
            Dijital
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3
          className="font-semibold text-lg line-clamp-2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/product/${slug}`)}
        >
          {name}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xl font-bold text-primary">
            ₺{price.toFixed(2)}
          </span>
          {comparePrice && (
            <span className="text-sm text-muted-foreground line-through">
              ₺{comparePrice.toFixed(2)}
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button className="w-full" onClick={handleAddToCart}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Sepete Ekle
        </Button>
      </CardFooter>
    </Card>
  );
};
