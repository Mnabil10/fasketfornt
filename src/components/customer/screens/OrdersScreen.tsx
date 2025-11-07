import React from 'react';
import { Button } from '../../ui/button';
import { ArrowLeft } from 'lucide-react';
import { MobileNav } from '../MobileNav';
import { AppState } from '../CustomerApp';

interface OrdersScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function OrdersScreen({ appState, updateAppState }: OrdersScreenProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
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
            My Orders
          </h1>
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Orders screen - Coming soon</p>
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}