import React, { useState } from 'react';
import { ChevronDown, Zap, Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CreditUpgradeDropdown = () => {
  const [userCredits] = useState(1250); // Example current credits
  const [isSubscribed] = useState(false); // Change this to test different states
  const [currentPlan] = useState('ugly-duckling'); // 'ugly-duckling', 'duckin-awesome', or null

  const plans = [
    {
      id: 'ugly-duckling',
      name: 'The Ugly Duckling',
      credits: 2000,
      bonus: 500,
      price: 18.95,
      icon: Zap,
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'ugly-duckling-inactive',
      name: 'The Ugly Duckling',
      credits: 2000,
      bonus: 500,
      price: 18.95,
      icon: Zap,
      color: 'from-blue-500 to-purple-600'
    },
    {
      id: 'duckin-awesome',
      name: "Duckin' Awesome",
      credits: 5000,
      bonus: 5000,
      price: 44.95,
      icon: Crown,
      color: 'from-purple-600 to-pink-600'
    }
  ];

  const handlePlanSelect = (planId) => {
    console.log(`Selected plan: ${planId}`);
  };

  const getUpgradeText = () => {
    if (!isSubscribed) {
      return "Choose your plan to get started";
    }
    if (currentPlan === 'ugly-duckling') {
      return "Ready to level up?";
    }
    return "You're on our premium plan!";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 h-auto p-2"
        >
          <div className="text-2xl">🪙</div>
          <span className="font-semibold">{userCredits.toLocaleString()}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-80 p-0 bg-white border border-gray-200 shadow-2xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="text-xl">🪙</div>
            <div className="flex items-baseline gap-2">
              <p className="font-semibold text-gray-800">{userCredits.toLocaleString()} Credits</p>
              <p className="text-xs text-gray-600">Current balance</p>
            </div>
          </div>
        </div>

        {/* Upgrade Message */}
        <div className="px-4 pt-3 pb-2 text-center">
          <h3 className="font-semibold text-gray-800 mb-1">{getUpgradeText()}</h3>
          <p className="text-sm text-gray-600">
            {!isSubscribed 
              ? "Unlock more credits with a monthly subscription" 
              : currentPlan === 'ugly-duckling' 
                ? "Get 4x more credits + bigger bonus"
                : "You have access to maximum credits!"
            }
          </p>
        </div>

        {/* Plans */}
        <div className="px-4 pb-2 space-y-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isUpgrade = currentPlan === 'ugly-duckling' && plan.id === 'duckin-awesome';
            
            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 border shadow-md ${
                  isCurrentPlan 
                    ? 'border-green-300 bg-green-50/50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => !isCurrentPlan && handlePlanSelect(plan.id)}
              >
                {isCurrentPlan && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-green-500 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  </div>
                )}
                
                <CardContent className="pt-3 px-3 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200">
                      <plan.icon className="w-5 h-5 text-gray-600" />
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{plan.name}</h4>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{plan.credits.toLocaleString()} Credits</span>
                        <span className="text-green-600 font-medium"> + {plan.bonus.toLocaleString()} Bonus</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-800">${plan.price}</span>
                        <span className="text-sm text-gray-500">Monthly</span>
                      </div>
                    </div>
                  </div>
                  
                  {!isCurrentPlan && (
                    <Button
                      className={`w-full mt-3 text-base transition-all duration-200 transform hover:scale-105 hover:shadow-lg ${
                        plan.id === 'ugly-duckling-inactive'
                          ? 'bg-transparent border border-black text-black hover:bg-purple-600 hover:text-white hover:border-purple-600 hover:shadow-purple-500/30'
                          : isUpgrade 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-800 hover:to-pink-800 hover:shadow-purple-500/30 text-white border-0' 
                          : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 text-white'
                      }`}
                      variant={plan.id === 'ugly-duckling-inactive' ? 'outline' : 'default'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanSelect(plan.id);
                      }}
                    >
                      {plan.id === 'ugly-duckling-inactive' 
                        ? 'Start Selling'
                        : isUpgrade 
                        ? 'Start Flying' 
                        : 'Subscribe Now'
                      }
                    </Button>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="mt-3 text-center">
                      <span className="text-sm text-green-600 font-medium">Current Plan</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 text-center border-t">
          <p className="text-xs text-gray-500 mb-1">
            Plans auto-renew monthly. Cancel anytime.
          </p>
          <Button 
            variant="link"
            size="sm"
            onClick={() => console.log('Navigate to full details page')}
            className="text-sm text-blue-600 hover:text-blue-800 h-auto p-0 font-medium"
          >
            See full details and features →
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CreditUpgradeDropdown;