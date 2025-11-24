import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog';
import { ShoppingCart, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  mode: 'auth' | 'register';
  onLogin: (user: any) => void;
  onToggleMode: () => void;
}

export function AuthScreen({ mode, onLogin, onToggleMode }: AuthScreenProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      onLogin({
        name: formData.name || 'John Doe',
        phone: formData.phone,
        id: '1'
      });
      setIsLoading(false);
    }, 1000);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex flex-col items-center pt-16 pb-8">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4">
          <div className="relative">
            <div className="text-2xl font-poppins text-white" style={{ fontWeight: 700 }}>
              F
            </div>
            <ShoppingCart className="absolute -top-1 -right-2 w-4 h-4 text-white" />
          </div>
        </div>
        <h1 className="font-poppins text-2xl text-gray-900 mb-2" style={{ fontWeight: 700 }}>
          {mode === 'auth' ? 'Welcome Back' : 'Create Account'}
        </h1>
        <p className="text-gray-600">
          {mode === 'auth' ? 'Sign in to continue shopping' : 'Join Fasket and start shopping'}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="h-12 rounded-xl"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="h-12 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="h-12 rounded-xl pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {mode === 'auth' && (
            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="text-primary p-0 h-auto">
                    Forgot Password?
                  </Button>
                </DialogTrigger>
                <DialogContent className="mx-4">
                  <DialogHeader>
                    <DialogTitle>Reset Password</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-gray-600">
                      Enter your phone number to receive a reset code.
                    </p>
                    <Input
                      type="tel"
                      placeholder="Phone number"
                      className="h-12 rounded-xl"
                    />
                    <Button className="w-full h-12 rounded-xl">
                      Send Reset Code
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl"
          >
            {isLoading ? 'Please wait...' : mode === 'auth' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-2">
            {mode === 'auth' ? "Don't have an account?" : "Already have an account?"}
          </p>
          <Button
            variant="outline"
            onClick={onToggleMode}
            className="w-full h-12 rounded-xl"
          >
            {mode === 'auth' ? 'Create Account' : 'Sign In'}
          </Button>
        </div>
      </div>
    </div>
  );
}