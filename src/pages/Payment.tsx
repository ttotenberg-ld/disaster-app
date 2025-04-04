import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../components/ThemeProvider';
import { useFlags } from 'launchdarkly-react-client-sdk';
import { Plan } from '../components/PricingPlans';
import { CreditCard, Lock } from 'lucide-react';
import { useAuthStore } from '../store/auth';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { applyThemeClass } = useTheme();
  const flags = useFlags();
  const { user } = useAuthStore();
  
  // Get the selected plan from location state
  const selectedPlan = location.state?.selectedPlan as Plan;
  
  // Form state with prepopulated fake data
  const [formData, setFormData] = useState({
    cardNumber: '4242 4242 4242 4242',
    expiryDate: '12/25',
    cvv: '123',
    name: '',
    email: '',
    address: '123 Demo Street',
    city: 'San Francisco',
    state: 'CA',
    zip: '94107',
    country: 'US',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Populate user data from auth store when component mounts
  useEffect(() => {
    if (user) {
      setFormData(prevData => ({
        ...prevData,
        name: user.fullName || '',
        email: user.email || ''
      }));
    }
  }, [user]);
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Format card number with spaces
    if (name === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
      setFormData({ ...formData, [name]: formatted });
      return;
    }
    
    // Format expiry date
    if (name === 'expiryDate') {
      const cleaned = value.replace(/\D/g, '');
      let formatted = cleaned;
      if (cleaned.length > 2) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
      }
      setFormData({ ...formData, [name]: formatted });
      return;
    }
    
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Simulate API call with timeout
    setTimeout(() => {
      setLoading(false);
      
      // Check if we should use the error simulation flag
      const simulateError = flags['simulate-payment-error'] === true;
      
      if (simulateError) {
        setError('Payment processing failed. Please try again or contact support.');
        return;
      }
      
      setSuccess(true);
      
      // Redirect to success page after 2 seconds
      setTimeout(() => {
        navigate('/profile', { state: { subscribed: true, plan: selectedPlan } });
      }, 2000);
    }, 1500);
  };
  
  // If no plan was selected, show error and link to pricing
  if (!selectedPlan) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">No Plan Selected</h2>
          <p className="mt-4 text-lg text-gray-500">
            Please select a plan from our pricing page to proceed with payment.
          </p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/', { state: { scrollToPricing: true } })}
              className={`${applyThemeClass()} px-4 py-2 rounded-md text-white`}
            >
              View Pricing
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // If payment was successful, show success message
  if (success) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <div className="bg-green-100 rounded-lg p-6 border border-green-200">
          <h2 className="text-2xl font-bold text-green-800">Payment Successful!</h2>
          <p className="mt-2 text-green-700">
            Thank you for subscribing to our {selectedPlan.name} plan. You will be redirected shortly.
          </p>
          <div className="mt-4 h-2 w-full bg-green-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="md:col-span-1">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 sticky top-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h3>
            
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between mb-2">
                <span className="font-medium">{selectedPlan.name} Plan</span>
                <span>${selectedPlan.price}/mo</span>
              </div>
              
              <div className="text-sm text-gray-500 mb-4">
                {selectedPlan.description}
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>${selectedPlan.price}/mo</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 text-sm text-gray-500 flex items-center justify-center">
              <Lock className="w-4 h-4 mr-1" />
              <span>Secure checkout</span>
            </div>
          </div>
        </div>
        
        {/* Payment Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Payment Details</h2>

            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Card Information
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700">
                        Card number
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="cardNumber"
                          name="cardNumber"
                          placeholder="4242 4242 4242 4242"
                          maxLength={19}
                          value={formData.cardNumber}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700">
                        Expiration date (MM/YY)
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="expiryDate"
                          name="expiryDate"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={formData.expiryDate}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="cvv" className="block text-sm font-medium text-gray-700">
                        CVV
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="cvv"
                          name="cvv"
                          placeholder="123"
                          maxLength={4}
                          value={formData.cvv}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Billing Information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name on card
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <div className="mt-1">
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Street address
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        State / Province
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
                        ZIP / Postal code
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="zip"
                          name="zip"
                          value={formData.zip}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                        Country
                      </label>
                      <div className="mt-1">
                        <select
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                          required
                        >
                          <option value="US">United States</option>
                          <option value="CA">Canada</option>
                          <option value="GB">United Kingdom</option>
                          <option value="AU">Australia</option>
                          <option value="DE">Germany</option>
                          <option value="FR">France</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-md shadow-sm text-white font-medium ${
                    loading ? 'opacity-70 cursor-not-allowed' : ''
                  } ${applyThemeClass()}`}
                >
                  {loading ? 'Processing...' : `Pay $${selectedPlan.price}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment; 