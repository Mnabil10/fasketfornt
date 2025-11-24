import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { ArrowLeft, Search, TrendingUp, Star } from 'lucide-react';
import { MobileNav } from '../MobileNav';
import { AppState } from '../CustomerApp';
import { ImageWithFallback } from '../../figma/ImageWithFallback';

interface CategoriesScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function CategoriesScreen({ appState, updateAppState }: CategoriesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const categories = [
    { id: 1, name: 'Dairy Products', icon: '🥛', color: 'bg-blue-100', items: 45, trending: true },
    { id: 2, name: 'Fresh Fruits', icon: '🍎', color: 'bg-red-100', items: 67, trending: true },
    { id: 3, name: 'Vegetables', icon: '🥕', color: 'bg-green-100', items: 52, popular: true },
    { id: 4, name: 'Bakery', icon: '🍞', color: 'bg-yellow-100', items: 28 },
    { id: 5, name: 'Meat & Seafood', icon: '🥩', color: 'bg-red-100', items: 34 },
    { id: 6, name: 'Beverages', icon: '🥤', color: 'bg-purple-100', items: 89, popular: true },
    { id: 7, name: 'Snacks', icon: '🍿', color: 'bg-orange-100', items: 76, trending: true },
    { id: 8, name: 'Frozen Foods', icon: '🧊', color: 'bg-blue-100', items: 41 },
    { id: 9, name: 'Pantry Staples', icon: '🏺', color: 'bg-gray-100', items: 93, popular: true },
    { id: 10, name: 'Health & Beauty', icon: '🧴', color: 'bg-pink-100', items: 58 },
    { id: 11, name: 'Household', icon: '🧽', color: 'bg-green-100', items: 72 },
    { id: 12, name: 'Pet Care', icon: '🐕', color: 'bg-yellow-100', items: 24 },
  ];

  const featuredProducts = [
    { id: 1, name: 'Fresh Strawberries', price: 4.99, image: 'https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0cyUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzU5NzU5NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Fresh Fruits', discount: 20 },
    { id: 2, name: 'Organic Milk', price: 3.49, image: 'https://images.unsplash.com/photo-1663566869071-6c926e373515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYWlyeSUyMHByb2R1Y3RzJTIwbWlsayUyMGNoZWVzZXxlbnwxfHx8fDE3NTk3OTg4NDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', category: 'Dairy Products' },
  ];

  const filters = [
    { id: 'all', label: 'All Categories' },
    { id: 'popular', label: 'Popular' },
    { id: 'trending', label: 'Trending' }
  ];

  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || 
                         (selectedFilter === 'popular' && category.popular) ||
                         (selectedFilter === 'trending' && category.trending);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateAppState({ currentScreen: 'home' })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Categories
          </h1>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 rounded-xl"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(filter.id)}
              className="rounded-full text-xs"
            >
              {filter.id === 'trending' && <TrendingUp className="w-3 h-3 mr-1" />}
              {filter.id === 'popular' && <Star className="w-3 h-3 mr-1" />}
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Featured Products Banner */}
        {selectedFilter === 'all' && (
          <div className="px-4 py-4">
            <h2 className="font-poppins text-lg text-gray-900 mb-3" style={{ fontWeight: 600 }}>
              Featured Today
            </h2>
            <div className="flex space-x-4 overflow-x-auto pb-2">
              {featuredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="min-w-48 bg-white rounded-xl p-3 shadow-sm relative cursor-pointer"
                  onClick={() => updateAppState({ 
                    selectedProduct: product, 
                    currentScreen: 'product-detail' 
                  })}
                >
                  {product.discount && (
                    <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                      -{product.discount}%
                    </Badge>
                  )}
                  <div className="w-full h-24 rounded-lg overflow-hidden mb-3">
                    <ImageWithFallback
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 text-sm">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                  <p className="font-poppins text-primary" style={{ fontWeight: 600 }}>
                    ${product.price}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories Grid */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              Browse Categories
            </h2>
            <span className="text-sm text-gray-500">
              {filteredCategories.length} categories
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {filteredCategories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                onClick={() => updateAppState({ 
                  selectedCategory: category, 
                  currentScreen: 'products' 
                })}
                className={`h-28 rounded-xl ${category.color} hover:opacity-80 transition-all duration-200 p-4 relative overflow-hidden`}
              >
                <div className="flex flex-col items-center text-center w-full relative z-10">
                  <div className="text-3xl mb-2">{category.icon}</div>
                  <div className="text-sm font-medium text-gray-700 mb-1">{category.name}</div>
                  <div className="text-xs text-gray-500">{category.items} items</div>
                  
                  {/* Badges */}
                  <div className="flex space-x-1 mt-2">
                    {category.trending && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Trending
                      </Badge>
                    )}
                    {category.popular && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Popular
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Decorative background pattern */}
                <div className="absolute top-0 right-0 w-8 h-8 opacity-10 text-gray-600 text-2xl">
                  {category.icon}
                </div>
              </Button>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="font-poppins text-lg text-gray-900 mb-2" style={{ fontWeight: 600 }}>
                No categories found
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