import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import InviteFriend from '../components/InviteFriend';
import { withLDConsumer, useLDClient } from 'launchdarkly-react-client-sdk';
import { LDFlagSet } from 'launchdarkly-js-client-sdk';
import { Users, CreditCard, ArrowUp, Gift, Activity, RefreshCw, Download, Bell, TrendingUp, AlertCircle } from 'lucide-react';
import { recordError, recordComponentError, recordApiError } from '../lib/launchdarkly';

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

  // Add realistic dashboard state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'warning' | 'error'}>>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  // Realistic dashboard functions that naturally generate errors
  const refreshDashboardData = async () => {
    setIsRefreshing(true);
    try {
      // Simulate API call that might fail
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 20% chance of failure to simulate real-world API issues
          if (Math.random() < 0.2) {
            reject(new Error('Failed to fetch latest dashboard data'));
          } else {
            resolve(null);
          }
        }, 1500 + Math.random() * 1000);
      });

      // Update stats with new data
      setStats({
        customers: Math.floor(Math.random() * 5000) + 1000,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        growth: Math.floor(Math.random() * 30) + 5,
        credits: Math.floor(Math.random() * 2000) + 100,
        activeUsers: Math.floor(Math.random() * 1000) + 200
      });
      
      setLastRefresh(new Date());
      addNotification('Dashboard data refreshed successfully', 'info');
    } catch (error) {
      recordApiError(
        '/api/dashboard/stats',
        503,
        'Dashboard refresh failed',
        {
          userId: user?.id,
          timestamp: new Date().toISOString(),
          retryAttempt: 1,
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      );
      addNotification('Failed to refresh dashboard data. Please try again.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const exportDashboardData = async () => {
    setIsExporting(true);
    try {
      // Simulate export process that might fail
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 15% chance of failure
          if (Math.random() < 0.15) {
            reject(new Error('Export service temporarily unavailable'));
          } else {
            resolve(null);
          }
        }, 2000 + Math.random() * 1500);
      });

      // Simulate successful export
      addNotification('Dashboard data exported successfully', 'info');
    } catch (error) {
      recordApiError(
        '/api/dashboard/export',
        500,
        'Export generation failed',
        {
          userId: user?.id,
          exportType: 'dashboard_summary',
          timestamp: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      );
      addNotification('Export failed. Please try again later.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const loadAdvancedAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      // Simulate analytics loading that might fail
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 25% chance of failure to simulate analytics service issues
          if (Math.random() < 0.25) {
            reject(new Error('Analytics service timeout'));
          } else {
            resolve(null);
          }
        }, 3000 + Math.random() * 2000);
      });

      addNotification('Advanced analytics loaded', 'info');
    } catch (error) {
      recordComponentError(
        'Dashboard',
        'Failed to load advanced analytics',
        {
          userId: user?.id,
          feature: 'advanced_analytics',
          timestamp: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      );
      addNotification('Analytics temporarily unavailable', 'warning');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const addNotification = (message: string, type: 'info' | 'warning' | 'error') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Auto-remove notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Simulate occasional background errors
  useEffect(() => {
    const interval = setInterval(() => {
      // 5% chance of background error every 30 seconds
      if (Math.random() < 0.05) {
        recordError(
          new Error('Background sync failed'),
          'Periodic background synchronization error',
          {
            userId: user?.id,
            backgroundTask: 'data_sync',
            timestamp: new Date().toISOString()
          }
        );
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.id]);

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
                  <div 
                    style={{
                      backgroundColor: 'var(--brand-primary-color)',
                      color: 'var(--brand-contrast-color)'
                    }}
                    className={`flex-shrink-0 rounded-md p-3`}
                  >
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

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mt-6 space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-md flex items-center justify-between ${
                  notification.type === 'error' ? 'bg-red-50 text-red-800' :
                  notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                  'bg-blue-50 text-blue-800'
                }`}
              >
                <div className="flex items-center">
                  {notification.type === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
                  {notification.type === 'warning' && <AlertCircle className="h-5 w-5 mr-2" />}
                  {notification.type === 'info' && <Bell className="h-5 w-5 mr-2" />}
                  <span>{notification.message}</span>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="text-sm underline hover:no-underline"
                >
                  Dismiss
                </button>
              </div>
            ))}
            {notifications.length > 1 && (
              <button
                onClick={clearNotifications}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear all notifications
              </button>
            )}
          </div>
        )}

        {/* Dashboard Controls */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Dashboard Controls</h3>
            <div className="mt-4 flex flex-wrap gap-4">
              <button
                onClick={refreshDashboardData}
                disabled={isRefreshing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
              
              <button
                onClick={exportDashboardData}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </button>
              
              <button
                onClick={loadAdvancedAnalytics}
                disabled={analyticsLoading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {analyticsLoading ? 'Loading...' : 'Load Analytics'}
              </button>
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
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