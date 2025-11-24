import React from 'react';
import { Button } from '../../ui/button';
import { ArrowLeft, MapPin, Plus } from 'lucide-react';
import { AppState } from '../CustomerApp';

interface AddressesScreenProps {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
}

export function AddressesScreen({ appState, updateAppState }: AddressesScreenProps) {
  const addresses = [
    { id: '1', label: 'Home', address: '123 Main St, Apt 4B, New York, NY 10001', isDefault: true },
    { id: '2', label: 'Work', address: '456 Office Blvd, Suite 200, New York, NY 10002', isDefault: false },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => updateAppState({ currentScreen: 'profile' })}
            className="p-2 mr-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            My Addresses
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {addresses.map((address) => (
            <div key={address.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="font-medium">{address.label}</span>
                    {address.isDefault && (
                      <span className="ml-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm">{address.address}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-primary">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full mt-4 h-12 rounded-xl">
          <Plus className="w-5 h-5 mr-2" />
          Add New Address
        </Button>
      </div>
    </div>
  );
}