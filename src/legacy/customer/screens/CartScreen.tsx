import React from 'react';
import { Button } from '../../ui/button';
import { Separator } from '../../ui/separator';
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react';
import { MobileNav } from '../MobileNav';
import { AppState } from '../CustomerApp';
import { ImageWithFallback } from '../../figma/ImageWithFallback';

interface CartScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function CartScreen({ appState, updateAppState }: CartScreenProps) {
  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity === 0) {
      updateAppState({
        cart: appState.cart.filter(item => item.id !== productId)
      });
    } else {
      updateAppState({
        cart: appState.cart.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      });
    }
  };

  const removeItem = (productId: number) => {
    updateAppState({
      cart: appState.cart.filter(item => item.id !== productId)
    });
  };

  const subtotal = appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = subtotal > 50 ? 0 : 4.99;
  const total = subtotal + deliveryFee;

  if (appState.cart.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => updateAppState({ currentScreen: 'home' })}
              className="p-2 mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              Shopping Cart
            </h1>
          </div>
        </div>

        {/* Empty Cart */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <div className="text-6xl">🛒</div>
          </div>
          <h2 className="font-poppins text-xl text-gray-900 mb-2" style={{ fontWeight: 600 }}>
            Your cart is empty
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Add some items to your cart to continue shopping
          </p>
          <Button 
            onClick={() => updateAppState({ currentScreen: 'home' })}
            className="h-12 px-8 rounded-xl"
          >
            Start Shopping
          </Button>
        </div>

        <MobileNav appState={appState} updateAppState={updateAppState} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateAppState({ currentScreen: 'home' })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Shopping Cart
          </h1>
          <span className="ml-2 text-gray-500">({appState.cart.length} items)</span>
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto pb-40">
        <div className="px-4 py-4 space-y-3">
          {appState.cart.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.category}</p>
                  <p className="font-poppins text-lg text-primary mt-1" style={{ fontWeight: 600 }}>
                    ${item.price}
                  </p>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 p-0 rounded-lg"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 p-0 rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="px-4 py-4">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <span>{deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              <span>Total</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </div>
          
          <Button 
            onClick={() => updateAppState({ currentScreen: 'checkout' })}
            className="w-full h-12 rounded-xl"
          >
            Proceed to Checkout
          </Button>
          
          {deliveryFee > 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Add ${(50 - subtotal).toFixed(2)} more for free delivery
            </p>
          )}
        </div>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}