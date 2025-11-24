import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { ArrowLeft, Search, Filter, SlidersHorizontal, Grid, List, Star } from 'lucide-react';
import { MobileNav } from '../MobileNav';
import { AppState } from '../CustomerApp';
import { ImageWithFallback } from '../../figma/ImageWithFallback';

interface ProductsScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function ProductsScreen({ appState, updateAppState }: ProductsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Mock products data - in a real app, this would be filtered by selected category
  const products = [
    { id: 1, name: 'Fresh Strawberries', price: 4.99, originalPrice: 6.99, image: 'https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0cyUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzU5NzU5NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Fresh Fruits', rating: 4.5, inStock: true, discount: 30 },
    { id: 2, name: 'Organic Milk', price: 3.49, image: 'https://images.unsplash.com/photo-1663566869071-6c926e373515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYWlyeSUyMHByb2R1Y3RzJTIwbWlsayUyMGNoZWVzZXxlbnwxfHx8fDE3NTk3OTg4NDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Dairy Products', rating: 4.8, inStock: true },
    { id: 3, name: 'Whole Grain Bread', price: 2.99, image: 'https://images.unsplash.com/photo-1679673987713-54f809ce417d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhicmVhZCUyMGJha2VyeSUyMGZyZXNofGVufDF8fHx8MTc1OTc3MjQ0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Bakery', rating: 4.3, inStock: true },
    { id: 4, name: 'Premium Orange Juice', price: 5.99, image: 'https://images.unsplash.com/photo-1651449815980-435741f55598?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm9jZXJ5JTIwYmFubmVycyUyMHByb21vdGlvbnxlbnwxfHx8fDE3NTk4NDg0MDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Beverages', rating: 4.6, inStock: false },
    { id: 5, name: 'Greek Yogurt', price: 4.49, image: 'https://images.unsplash.com/photo-1663566869071-6c926e373515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYWlyeSUyMHByb2R1Y3RzJTIwbWlsayUyMGNoZWVzZXxlbnwxfHx8fDE3NTk3OTg4NDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Dairy Products', rating: 4.7, inStock: true },
    { id: 6, name: 'Red Apples', price: 3.99, image: 'https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0cyUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzU5NzU5NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Fresh Fruits', rating: 4.4, inStock: true },
  ];

  const sortOptions = [
    { id: 'popularity', label: 'Most Popular' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'rating', label: 'Highest Rated' },
    { id: 'name', label: 'Name A-Z' },
  ];

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const addToCart = (product: any) => {
    const existingItem = appState.cart.find(item => item.id === product.id);
    if (existingItem) {
      updateAppState({
        cart: appState.cart.map(item =>
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        )
      });
    } else {
      updateAppState({
        cart: [...appState.cart, { ...product, quantity: 1 }]
      });
    }
  };

  const renderProductCard = (product: any) => {
    if (viewMode === 'list') {
      return (
        <div key={product.id} className="bg-white rounded-xl p-4 shadow-sm mb-3">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden relative">
              <ImageWithFallback
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.discount && (
                <Badge variant="destructive" className="absolute top-1 right-1 text-xs px-1 py-0">
                  -{product.discount}%
                </Badge>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
              <p className="text-xs text-gray-500 mb-2">{product.category}</p>
              <div className="flex items-center mb-2">
                <div className="flex items-center">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="text-xs text-gray-600">{product.rating}</span>
                </div>
                {!product.inStock && (
                  <Badge variant="secondary" className="ml-2 text-xs">Out of Stock</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <span className="font-poppins text-lg text-primary" style={{ fontWeight: 600 }}>
                    ${product.price}
                  </span>
                  {product.originalPrice && (
                    <span className="text-sm text-gray-500 line-through">
                      ${product.originalPrice}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => addToCart(product)}
                  disabled={!product.inStock}
                  className="h-8 px-3"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={product.id} 
        className="bg-white rounded-xl p-3 shadow-sm cursor-pointer"
        onClick={() => updateAppState({ selectedProduct: product, currentScreen: 'product-detail' })}
      >
        <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3">
          <ImageWithFallback
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {product.discount && (
            <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
              -{product.discount}%
            </Badge>
          )}
          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}
        </div>
        <h3 className="font-medium text-gray-900 mb-1 text-sm">{product.name}</h3>
        <p className="text-xs text-gray-500 mb-2">{product.category}</p>
        <div className="flex items-center mb-2">
          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 mr-1" />
          <span className="text-xs text-gray-600">{product.rating}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center space-x-1">
              <span className="font-poppins text-primary" style={{ fontWeight: 600 }}>
                ${product.price}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-gray-500 line-through">
                  ${product.originalPrice}
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            disabled={!product.inStock}
            className="h-7 px-2 text-xs"
          >
            Add
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateAppState({ currentScreen: 'categories' })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            {appState.selectedCategory?.name || 'All Products'}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>

        {/* Filter and Sort Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            >
              {sortOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">{sortedProducts.length} items</span>
            <div className="flex border border-gray-200 rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="p-2 rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="p-2 rounded-l-none"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="flex items-center space-x-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-600" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer">In Stock</Badge>
            <Badge variant="outline" className="cursor-pointer">On Sale</Badge>
            <Badge variant="outline" className="cursor-pointer">Organic</Badge>
            <Badge variant="outline" className="cursor-pointer">Local</Badge>
          </div>
        </div>
      )}

      {/* Products Grid/List */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-4">
          {sortedProducts.length > 0 ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-0'}>
              {sortedProducts.map(renderProductCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="font-poppins text-lg text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                No products found
              </h3>
              <p className="text-gray-600">
                Try searching with different keywords
              </p>
            </div>
          )}
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}