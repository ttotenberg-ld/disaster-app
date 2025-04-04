import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import InviteFriend from '../components/InviteFriend';
import { useTheme } from '../components/ThemeProvider';
import { withLDConsumer, useLDClient } from 'launchdarkly-react-client-sdk';
import { LDFlagSet } from 'launchdarkly-js-client-sdk';
import { Users, CreditCard, ArrowUp, Gift, Activity } from 'lucide-react';

type DashboardProps = {
  flags?: LDFlagSet;
};

// Define card type for better type safety
interface DashboardCard {
  title: string;
  value: string;
  icon: JSX.Element;
  change: string;
  positive: boolean;
}

const Dashboard = ({ flags }: DashboardProps) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { applyThemeClass } = useTheme();
  const ldClient = useLDClient();
  
  const [stats, setStats] = useState({
    customers: 0,
    revenue: 0,
    growth: 0,
    credits: 0,
    activeUsers: 0
  });
  
  // Store flag values in state
  const [flagValues, setFlagValues] = useState({
    showGrowthMetric: false,
    showCreditsMetric: false
  });
  
  // Track dashboard cards in state
  const [dashboardCards, setDashboardCards] = useState<DashboardCard[]>([]);

  // Flag changes callback
  const updateFlagsFromClient = useCallback(() => {
    if (!ldClient) return;
    
    // Get current values directly from the client
    const showGrowthMetric = ldClient.variation('show-growth-metric', false);
    const showCreditsMetric = ldClient.variation('show-credits-metric', false);
    
    setFlagValues({
      showGrowthMetric: Boolean(showGrowthMetric),
      showCreditsMetric: Boolean(showCreditsMetric)
    });
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
    setFlagValues(prev => ({
      showGrowthMetric: Boolean(flags && flags['show-growth-metric'] === true) || prev.showGrowthMetric,
      showCreditsMetric: Boolean(flags && flags['show-credits-metric'] === true) || prev.showCreditsMetric
    }));
  }, [flags]);

  // Simulate fetching dashboard stats
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Simulate fetching dashboard data with random values
    const fetchStats = () => {
      // Generate random stats for demo purposes
      setStats({
        customers: Math.floor(Math.random() * 5000) + 1000,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        growth: Math.floor(Math.random() * 30) + 5,
        credits: Math.floor(Math.random() * 2000) + 100,
        activeUsers: Math.floor(Math.random() * 1000) + 200
      });
    };

    fetchStats();
  }, [user, navigate]);
  
  // Update dashboard cards when either stats or flag values change
  useEffect(() => {
    const baseCards: DashboardCard[] = [
      {
        title: 'Total Customers',
        value: stats.customers.toLocaleString(),
        icon: <Users className="h-6 w-6 text-white" />,
        change: '+12.5%',
        positive: true
      },
      {
        title: 'Revenue',
        value: `$${stats.revenue.toLocaleString()}`,
        icon: <CreditCard className="h-6 w-6 text-white" />,
        change: '+18.2%',
        positive: true
      },
      {
        title: 'Active Users',
        value: stats.activeUsers.toLocaleString(),
        icon: <Activity className="h-6 w-6 text-white" />,
        change: '+5.1%',
        positive: true
      }
    ];
    
    const cards: DashboardCard[] = [...baseCards];
    
    if (flagValues.showGrowthMetric) {
      cards.push({
        title: 'Growth',
        value: `${stats.growth}%`,
        icon: <ArrowUp className="h-6 w-6 text-white" />,
        change: '+2.3%',
        positive: true
      });
    }
    
    if (flagValues.showCreditsMetric) {
      cards.push({
        title: 'Credits Earned',
        value: stats.credits.toLocaleString(),
        icon: <Gift className="h-6 w-6 text-white" />,
        change: '+25.8%',
        positive: true
      });
    }
    
    setDashboardCards(cards);
  }, [stats, flagValues]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user.fullName}. Here's a summary of your account.
        </p>
        
        {/* Dashboard stats */}
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dashboardCards.map((card, index) => (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${applyThemeClass()} rounded-md p-3`}>
                    {card.icon}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">{card.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-5 py-3">
                <div className="text-sm">
                  <span className={card.positive ? 'text-green-600' : 'text-red-600'}>
                    {card.change} from last month
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* InviteFriend section */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Invite Friends & Earn Rewards</h3>
            <div className="mt-4">
              <InviteFriend />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withLDConsumer()(Dashboard); 