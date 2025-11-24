import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ArrowLeft, Plus, Minus, Heart, Star, ShoppingCart } from 'lucide-react';
import { AppState } from '../CustomerApp';
import { ImageWithFallback } from '../../figma/ImageWithFallback';

interface ProductDetailScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function ProductDetailScreen({ appState, updateAppState }: ProductDetailScreenProps) {
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const product = appState.selectedProduct;

  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Product not found</p>
      </div>
    );
  }

  // Mock additional product images
  const productImages = [
    product.image,
    product.image, // In a real app, these would be different angles
    product.image
  ];

  // Mock suggested products
  const suggestedProducts = [
    { id: 101, name: 'Organic Bananas', price: 2.99, image: product.image, category: 'Fruits' },
    { id: 102, name: 'Greek Yogurt', price: 4.49, image: product.image, category: 'Dairy' },
    { id: 103, name: 'Whole Grain Cereal', price: 5.99, image: product.image, category: 'Pantry' }
  ];

  const addToCart = () => {
    const existingItem = appState.cart.find(item => item.id === product.id);
    if (existingItem) {
      updateAppState({
        cart: appState.cart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        )
      });
    } else {
      updateAppState({
        cart: [...appState.cart, { ...product, quantity }]
      });
    }
    updateAppState({ currentScreen: 'cart' });
  };

  const addSuggestedToCart = (suggestedProduct: any) => {
    const existingItem = appState.cart.find(item => item.id === suggestedProduct.id);
    if (existingItem) {
      updateAppState({
        cart: appState.cart.map(item =>
          item.id === suggestedProduct.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      });
    } else {
      updateAppState({
        cart: [...appState.cart, { ...suggestedProduct, quantity: 1 }]
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white sticky top-0 z-10 border-b border-gray-100">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => updateAppState({ currentScreen: 'products' })}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2"
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateAppState({ currentScreen: 'cart' })}
            className="p-2 relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {appState.cart.length > 0 && (
              <div className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {appState.cart.length}
              </div>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Product Image Carousel */}
        <div className="relative">
          <div className="w-full h-80 px-4 mb-4">
            <ImageWithFallback
              src={productImages[currentImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          
          {/* Image Indicators */}
          <div className="flex justify-center space-x-2 mb-4">
            {productImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="px-4">
          <div className="flex items-start justify-between mb-3">
            <h1 className="font-poppins text-2xl text-gray-900 flex-1 mr-4" style={{ fontWeight: 700 }}>
              {product.name}
            </h1>
            {product.discount && (
              <Badge variant="destructive" className="rounded-lg">
                -{product.discount}%
              </Badge>
            )}
          </div>
          
          <p className="text-gray-600 mb-3">{product.category}</p>
          
          <div className="flex items-center mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.floor(product.rating || 4.5)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-500 ml-2 text-sm">({product.rating || 4.5}) • 127 reviews</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Product Details</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Fresh, high-quality {product.name.toLowerCase()} sourced from local farms. 
              Perfect for your daily nutrition needs. Rich in vitamins and minerals.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-xs">Fresh</Badge>
              <Badge variant="secondary" className="text-xs">Organic</Badge>
              <Badge variant="secondary" className="text-xs">Local Farm</Badge>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6 bg-gray-50 rounded-xl p-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-poppins text-3xl text-primary" style={{ fontWeight: 700 }}>
                  ${product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-gray-500 line-through text-lg">
                    ${product.originalPrice}
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-600">per unit</span>
            </div>
            <div className="flex items-center space-x-3 bg-white rounded-xl p-2 border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 p-0 rounded-lg"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 p-0 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Suggested Items */}
          <div className="mb-6">
            <h3 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
              You might also like
            </h3>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {suggestedProducts.map((item) => (
                <div key={item.id} className="min-w-32 bg-gray-50 rounded-xl p-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden mb-2 mx-auto">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-xs font-medium text-gray-900 text-center mb-1 line-clamp-2">
                    {item.name}
                  </h4>
                  <p className="text-xs text-primary text-center mb-2" style={{ fontWeight: 600 }}>
                    ${item.price}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => addSuggestedToCart(item)}
                    className="w-full h-6 text-xs rounded-md"
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Add to Cart Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <Button onClick={addToCart} className="w-full h-12 rounded-xl">
          Add to Cart • ${(product.price * quantity).toFixed(2)}
        </Button>
      </div>
    </div>
  );
}