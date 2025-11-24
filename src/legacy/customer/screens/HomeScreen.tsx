import React from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Search, ShoppingCart, Bell } from 'lucide-react';
import { MobileNav } from '../MobileNav';
import { AppState } from '../CustomerApp';
import { ImageWithFallback } from '../../figma/ImageWithFallback';

interface HomeScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function HomeScreen({ appState, updateAppState }: HomeScreenProps) {
  const promos = [
    {
      id: 1,
      title: "Fresh Fruits 30% Off",
      subtitle: "Premium quality fruits",
      image: "https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0cyUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzU5NzU5NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    },
    {
      id: 2,
      title: "Free Delivery Today",
      subtitle: "On orders above $50",
      image: "https://images.unsplash.com/photo-1665521032636-e8d2f6927053?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpdmVyeSUyMHRydWNrJTIwZmFzdHxlbnwxfHx8fDE3NTk4NDIxNjB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
    }
  ];

  const categories = [
    { id: 1, name: 'Dairy', icon: '🥛', color: 'bg-blue-100' },
    { id: 2, name: 'Drinks', icon: '🥤', color: 'bg-purple-100' },
    { id: 3, name: 'Bakery', icon: '🍞', color: 'bg-yellow-100' },
    { id: 4, name: 'Fruits', icon: '🍎', color: 'bg-red-100' }
  ];

  const popularItems = [
    { id: 1, name: 'Fresh Milk', price: 3.99, image: "https://images.unsplash.com/photo-1663566869071-6c926e373515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYWlyeSUyMHByb2R1Y3RzJTIwbWlsayUyMGNoZWVzZXxlbnwxfHx8fDE3NTk3OTg4NDh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", category: 'Dairy' },
    { id: 2, name: 'Whole Bread', price: 2.49, image: "https://images.unsplash.com/photo-1679673987713-54f809ce417d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHhicmVhZCUyMGJha2VyeSUyMGZyZXNofGVufDF8fHx8MTc1OTc3MjQ0MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", category: 'Bakery' },
    { id: 3, name: 'Red Apples', price: 4.99, image: "https://images.unsplash.com/photo-1705727209465-b292e4129a37?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZydWl0cyUyMHZlZ2V0YWJsZXN8ZW58MXx8fHwxNzU5NzU5NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", category: 'Fruits' },
    { id: 4, name: 'Orange Juice', price: 5.99, image: "https://images.unsplash.com/photo-1651449815980-435741f55598?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxncm9jZXJ5JTIwYmFubmVycyUyMHByb21vdGlvbnxlbnwxfHx8fDE3NTk4NDg0MDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral", category: 'Drinks' }
  ];

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

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 700 }}>
              Hi, {appState.user?.name || 'User'}!
            </h1>
            <p className="text-gray-600">What do you need today?</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="p-2">
              <Bell className="w-5 h-5" />
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

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Search for groceries..."
            className="pl-10 h-12 rounded-xl"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Promo Banners */}
        <div className="px-4 py-4">
          <div className="flex space-x-4 overflow-x-auto">
            {promos.map((promo) => (
              <div key={promo.id} className="min-w-80 bg-primary rounded-xl p-4 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="font-poppins text-lg mb-1" style={{ fontWeight: 700 }}>
                    {promo.title}
                  </h3>
                  <p className="text-white/90">{promo.subtitle}</p>
                  <Button variant="secondary" size="sm" className="mt-3">
                    Shop Now
                  </Button>
                </div>
                <div className="absolute right-0 top-0 w-32 h-full opacity-20">
                  <ImageWithFallback
                    src={promo.image}
                    alt={promo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Categories */}
        <div className="px-4 py-2">
          <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
            Shop by Category
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant="ghost"
                onClick={() => updateAppState({ currentScreen: 'categories' })}
                className={`h-20 rounded-xl ${category.color} hover:opacity-80 transition-opacity p-2`}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs font-medium text-gray-700">{category.name}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Popular Items */}
        <div className="px-4 py-2">
          <h2 className="font-poppins text-lg text-gray-900 mb-4" style={{ fontWeight: 600 }}>
            Popular Items
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {popularItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm">
                <div className="w-full h-24 rounded-lg overflow-hidden mb-3">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{item.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{item.category}</p>
                <div className="flex items-center justify-between">
                  <span className="font-poppins text-lg text-primary" style={{ fontWeight: 600 }}>
                    ${item.price}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => addToCart(item)}
                    className="h-8 px-3 rounded-lg"
                  >
                    Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}