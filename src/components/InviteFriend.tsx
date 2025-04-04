import React, { useState, useEffect, useCallback } from 'react';
import { withLDConsumer, useLDClient } from 'launchdarkly-react-client-sdk';
import { LDFlagSet } from 'launchdarkly-js-client-sdk';
import { useTheme } from './ThemeProvider';
import { Gift, Users, X } from 'lucide-react';

type InviteFriendProps = {
  flags?: LDFlagSet;
};

const InviteFriend = ({ flags = {} }: InviteFriendProps) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { applyThemeClass } = useTheme();
  const ldClient = useLDClient();
  
  // Store flag values in state so we can track when they change
  const [flagValues, setFlagValues] = useState({
    position: 'sidebar',
    creditAmount: 10,
    copyType: 'default',
    inviteCount: 42
  });
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(true);
  
  // Flag changes callback
  const updateFlagsFromClient = useCallback(() => {
    if (!ldClient) return;
    
    // Get current values directly from the client
    const position = ldClient.variation('invite-friend-position', 'sidebar');
    const creditAmount = ldClient.variation('invite-friend-credit-amount', 10);
    const copyType = ldClient.variation('invite-friend-copy', 'default');
    const inviteCount = ldClient.variation('invite-friend-count', 42);
    
    // Normalize position - treat 'inline' as 'sidebar' for backward compatibility
    const normalizedPosition = position === 'inline' ? 'sidebar' : position;
    
    setFlagValues({
      position: String(normalizedPosition || 'sidebar'),
      creditAmount: Number(creditAmount || 10),
      copyType: String(copyType || 'default'),
      inviteCount: Number(inviteCount || 42)
    });
    
    // Reset modal state whenever position changes to modal
    if (String(normalizedPosition) === 'modal') {
      setModalOpen(true);
    }
  }, [ldClient]);
  
  // Set up flag change listener
  useEffect(() => {
    if (!ldClient) return;
    
    // Initial update
    updateFlagsFromClient();
    
    // Set up flag change listener
    ldClient.on('change', updateFlagsFromClient);
    
    // Clean up
    return () => {
      ldClient.off('change', updateFlagsFromClient);
    };
  }, [ldClient, updateFlagsFromClient]);
  
  // Update local state whenever props flags change (as backup)
  useEffect(() => {
    let newPosition = String(flags['invite-friend-position'] || flagValues.position);
    
    // Normalize position - treat 'inline' as 'sidebar' for backward compatibility
    if (newPosition === 'inline') {
      newPosition = 'sidebar';
    }
    
    setFlagValues(prev => ({
      position: newPosition,
      creditAmount: Number(flags['invite-friend-credit-amount'] || prev.creditAmount),
      copyType: String(flags['invite-friend-copy'] || prev.copyType),
      inviteCount: Number(flags['invite-friend-count'] || prev.inviteCount)
    }));
    
    // Reset modal state whenever position changes to modal
    if (newPosition === 'modal') {
      setModalOpen(true);
    }
  }, [flags]);
  
  // Get copy based on flag value
  const getCopyText = () => {
    switch(flagValues.copyType) {
      case 'friendly':
        return `Invite your friends and both get $${flagValues.creditAmount} in account credit!`;
      case 'professional':
        return `Refer colleagues to receive $${flagValues.creditAmount} credit for each successful registration.`;
      case 'urgent':
        return `Limited time offer! Invite friends now for $${flagValues.creditAmount} credit!`;
      default:
        return `Share with friends and get $${flagValues.creditAmount} credit for each signup.`;
    }
  };
  
  // Get headline based on flag value
  const getHeadline = () => {
    switch(flagValues.copyType) {
      case 'friendly':
        return 'Invite friends, earn rewards!';
      case 'professional':
        return 'Referral Program';
      case 'urgent':
        return 'Limited Time Offer!';
      default:
        return 'Invite a Friend';
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setEmail('');
    }, 1200);
  };
  
  const getInviteCardContent = () => (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <Gift className={`h-6 w-6 ${applyThemeClass('500')}`} />
        <h3 className="ml-2 text-lg font-semibold text-gray-900">
          {getHeadline()}
        </h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        {getCopyText()}
      </p>
      
      {!submitted ? (
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-2">
            <label htmlFor="friend-email" className="sr-only">
              Friend's Email
            </label>
            <input
              id="friend-email"
              type="email"
              placeholder="Friend's email address"
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              className={`${applyThemeClass()} text-white px-4 py-2 rounded-md text-sm font-medium ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center p-4 bg-green-50 rounded-md">
          <p className="text-green-800 font-medium">Invitation sent!</p>
          <p className="text-sm text-green-600 mt-1">
            You'll receive ${flagValues.creditAmount} credit when your friend signs up.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Send another invitation
          </button>
        </div>
      )}
      
      <div className="mt-4 flex items-center text-xs text-gray-500">
        <Users className="h-4 w-4 mr-1" />
        <span>
          {flagValues.inviteCount} people have earned credits in the last week
        </span>
      </div>
    </div>
  );
  
  // Simplified rendering - only sidebar (default) or modal
  if (flagValues.position === 'modal') {
    return modalOpen ? (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
          <div className="flex justify-end p-2">
            <button 
              onClick={() => setModalOpen(false)} 
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {getInviteCardContent()}
        </div>
      </div>
    ) : null;
  }
  
  // Default sidebar version
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {getInviteCardContent()}
    </div>
  );
};

export default withLDConsumer()(InviteFriend); 