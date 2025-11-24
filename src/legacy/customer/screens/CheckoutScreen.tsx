import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { Badge } from '../../ui/badge';
import { ArrowLeft, MapPin, Plus, Clock, Truck, CreditCard, Wallet, DollarSign } from 'lucide-react';
import { AppState } from '../CustomerApp';
import { ImageWithFallback } from '../../figma/ImageWithFallback';

interface CheckoutScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function CheckoutScreen({ appState, updateAppState }: CheckoutScreenProps) {
  const [selectedAddress, setSelectedAddress] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('standard');

  const addresses = [
    { 
      id: '1', 
      label: 'Home', 
      address: '123 Main St, Apt 4B', 
      city: 'New York, NY 10001',
      type: 'home',
      isDefault: true
    },
    { 
      id: '2', 
      label: 'Work', 
      address: '456 Office Blvd, Suite 200', 
      city: 'New York, NY 10002',
      type: 'work',
      isDefault: false
    },
  ];

  const paymentMethods = [
    { 
      id: 'cod', 
      label: 'Cash on Delivery', 
      icon: DollarSign, 
      description: 'Pay when you receive your order' 
    },
    { 
      id: 'card', 
      label: 'Credit/Debit Card', 
      icon: CreditCard, 
      description: 'Visa, Mastercard, American Express' 
    },
    { 
      id: 'wallet', 
      label: 'Digital Wallet', 
      icon: Wallet, 
      description: 'Apple Pay, Google Pay, PayPal' 
    },
  ];

  const deliveryOptions = [
    { 
      id: 'standard', 
      label: 'Standard Delivery', 
      time: '30-45 min', 
      price: 4.99, 
      description: 'Regular delivery time' 
    },
    { 
      id: 'express', 
      label: 'Express Delivery', 
      time: '15-20 min', 
      price: 8.99, 
      description: 'Get your order faster' 
    },
  ];

  const subtotal = appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const selectedDeliveryOption = deliveryOptions.find(option => option.id === deliveryTime);
  const deliveryFee = subtotal > 50 && deliveryTime === 'standard' ? 0 : selectedDeliveryOption?.price || 4.99;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    // Create order object
    const order = {
      id: Date.now().toString(),
      items: appState.cart,
      total: total,
      address: addresses.find(addr => addr.id === selectedAddress),
      paymentMethod,
      deliveryNotes,
      deliveryTime,
      status: 'confirmed',
      date: new Date().toISOString(),
    };

    // Clear cart and navigate to success
    updateAppState({
      cart: [],
      currentScreen: 'order-success'
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateAppState({ currentScreen: 'cart' })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            Checkout
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Order Items Preview */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Order Items ({appState.cart.length})
          </h2>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {appState.cart.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                  <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Address */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-poppins text-lg" style={{ fontWeight: 600 }}>
              Delivery Address
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary p-0"
              onClick={() => updateAppState({ currentScreen: 'addresses' })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add New
            </Button>
          </div>
          
          <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
            {addresses.map((address) => (
              <div key={address.id} className={`p-3 border rounded-lg transition-colors ${selectedAddress === address.id ? 'border-primary bg-accent' : 'border-gray-200'}`}>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                      <Label htmlFor={address.id} className="font-medium">{address.label}</Label>
                      {address.isDefault && (
                        <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{address.address}</p>
                    <p className="text-sm text-gray-500">{address.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Delivery Options */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Delivery Options
          </h2>
          <RadioGroup value={deliveryTime} onValueChange={setDeliveryTime}>
            {deliveryOptions.map((option) => (
              <div key={option.id} className={`p-3 border rounded-lg transition-colors ${deliveryTime === option.id ? 'border-primary bg-accent' : 'border-gray-200'}`}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Truck className="w-5 h-5 text-gray-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={option.id} className="font-medium">{option.label}</Label>
                      <div className="text-right">
                        <span className="font-medium text-gray-900">${option.price}</span>
                        {option.id === 'standard' && subtotal > 50 && (
                          <Badge variant="destructive" className="ml-2 text-xs">FREE</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center mt-1">
                      <Clock className="w-3 h-3 text-gray-400 mr-1" />
                      <span className="text-sm text-gray-600">{option.time}</span>
                      <span className="text-xs text-gray-500 ml-2">• {option.description}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Delivery Notes */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Delivery Notes
          </h2>
          <Textarea
            placeholder="Any special instructions for delivery..."
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            className="min-h-20 rounded-lg"
          />
        </div>

        {/* Payment Method */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Payment Method
          </h2>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            {paymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className={`p-3 border rounded-lg transition-colors ${paymentMethod === method.id ? 'border-primary bg-accent' : 'border-gray-200'}`}>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={method.id} id={method.id} />
                    <Icon className="w-5 h-5 text-gray-500" />
                    <div className="flex-1">
                      <Label htmlFor={method.id} className="font-medium">{method.label}</Label>
                      <p className="text-sm text-gray-500">{method.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </div>

        {/* Order Summary */}
        <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
          <h2 className="font-poppins text-lg mb-4" style={{ fontWeight: 600 }}>
            Order Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({appState.cart.length} items)</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Delivery Fee</span>
              <div className="text-right">
                {deliveryFee === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  <span>${deliveryFee.toFixed(2)}</span>
                )}
              </div>
            </div>
            {deliveryTime === 'standard' && subtotal < 50 && (
              <div className="text-xs text-gray-500">
                Add ${(50 - subtotal).toFixed(2)} more for free standard delivery
              </div>
            )}
            <div className="border-t pt-2">
              <div className="flex justify-between font-poppins text-lg" style={{ fontWeight: 600 }}>
                <span>Total</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <Button onClick={handlePlaceOrder} className="w-full h-12 rounded-xl">
          Place Order • ${total.toFixed(2)}
        </Button>
        <p className="text-xs text-gray-500 text-center mt-2">
          Estimated delivery time: {selectedDeliveryOption?.time || '30-45 min'}
        </p>
      </div>
    </div>
  );
}