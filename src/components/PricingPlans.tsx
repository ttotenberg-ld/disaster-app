import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { withLDConsumer } from 'launchdarkly-react-client-sdk';
import { LDFlagSet } from 'launchdarkly-js-client-sdk';
import { Link } from 'react-router-dom';

// Define available plans
export interface PlanFeature {
  name: string;
  includedIn: ('free' | 'silver' | 'gold' | 'platinum')[];
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

// Default features for all plans
const defaultFeatures: PlanFeature[] = [
  { name: 'Basic dashboard access', includedIn: ['free', 'silver', 'gold', 'platinum'] },
  { name: 'Up to 5 users', includedIn: ['free', 'silver', 'gold', 'platinum'] },
  { name: 'Basic analytics', includedIn: ['free', 'silver', 'gold', 'platinum'] },
  { name: 'Email support', includedIn: ['silver', 'gold', 'platinum'] },
  { name: 'Advanced analytics', includedIn: ['silver', 'gold', 'platinum'] },
  { name: 'Up to 20 users', includedIn: ['silver', 'gold', 'platinum'] },
  { name: 'Priority support', includedIn: ['gold', 'platinum'] },
  { name: 'Custom integrations', includedIn: ['gold', 'platinum'] },
  { name: 'Up to 50 users', includedIn: ['gold', 'platinum'] },
  { name: 'Dedicated account manager', includedIn: ['platinum'] },
  { name: 'Unlimited users', includedIn: ['platinum'] },
  { name: 'Custom development', includedIn: ['platinum'] },
];

// Default plans
const defaultPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out our platform',
    features: defaultFeatures,
  },
  {
    id: 'silver',
    name: 'Silver',
    price: 19,
    description: 'For small teams and startups',
    features: defaultFeatures,
    popular: true,
  },
  {
    id: 'gold',
    name: 'Gold',
    price: 49,
    description: 'For growing businesses',
    features: defaultFeatures,
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 99,
    description: 'For enterprises and large organizations',
    features: defaultFeatures,
  },
];

interface PricingPlansProps {
  onSelectPlan?: (plan: Plan) => void;
  flags?: LDFlagSet;
}

const PricingPlansComponent: React.FC<PricingPlansProps> = ({ onSelectPlan, flags = {} }) => {
  const [plans, setPlans] = useState([...defaultPlans]);
  
  // Update plans based on flags
  useEffect(() => {
    const customPlanEnabled = flags['custom-enterprise-plan'] === true;
    
    const updatedPlans = [...defaultPlans];
    
    if (customPlanEnabled) {
      updatedPlans.push({
        id: 'enterprise',
        name: 'Enterprise',
        price: 299,
        description: 'Custom enterprise solution for large organizations',
        features: defaultFeatures,
        popular: false,
      });
    }
    
    setPlans(updatedPlans);
  }, [flags]);

  const handleSelectPlan = (plan: Plan) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  return (
    <div className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Pricing Plans
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Choose the perfect plan for your needs
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={plan.popular ? { borderColor: 'var(--brand-primary-color)' } : {}}
              className={`border border-gray-200 rounded-lg shadow-sm divide-y divide-gray-200 flex flex-col ${
                plan.popular ? 'border-2' : ''
              }`}
            >
              {plan.popular && (
                <div 
                  style={{
                    backgroundColor: 'var(--brand-primary-color)',
                    color: 'var(--brand-contrast-color)'
                  }}
                  className={`py-1 text-sm text-center font-semibold rounded-t-lg`}
                >
                  Most Popular
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
                  <span className="text-base font-medium text-gray-500">/mo</span>
                </p>
                <Link
                  to="/payment"
                  onClick={() => handleSelectPlan(plan)}
                  style={{
                    backgroundColor: 'var(--brand-primary-color)',
                    color: 'var(--brand-contrast-color)'
                  }}
                  className={`mt-6 block w-full py-2 px-4 rounded-md text-sm font-medium text-center hover:opacity-90`}
                  state={{ selectedPlan: plan }}
                >
                  {plan.price === 0 ? 'Get Started' : 'Subscribe Now'}
                </Link>
              </div>
              <div className="pt-6 pb-8 px-6">
                <h4 className="text-sm font-medium text-gray-900 tracking-wide">Features included:</h4>
                <ul className="mt-4 space-y-3">
                  {defaultFeatures.map((feature, idx) => {
                    const included = feature.includedIn.includes(plan.id as 'free' | 'silver' | 'gold' | 'platinum');
                    return (
                      <li key={idx} className="flex items-start">
                        {included ? (
                          <CheckCircle className="flex-shrink-0 h-5 w-5 text-green-500" />
                        ) : (
                          <X className="flex-shrink-0 h-5 w-5 text-gray-400" />
                        )}
                        <span className={`ml-2 text-sm ${included ? 'text-gray-700' : 'text-gray-400'}`}>
                          {feature.name}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Export the wrapped component
export const PricingPlans = withLDConsumer()(PricingPlansComponent); 