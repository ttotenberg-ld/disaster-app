import React, { useState } from 'react';
import { LDObserve } from '@launchdarkly/observability';

export const ObservabilityExample: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleTrackError = () => {
    try {
      // Simulate an error
      throw new Error('This is a test error for observability');
    } catch (error) {
      LDObserve.recordError(error as Error, 'User clicked test error button', {
        component: 'ObservabilityExample',
        userAction: 'test-error-button'
      });
    }
  };

  const handleTrackLog = () => {
    LDObserve.recordLog('User interaction: Log test button clicked', 'info');
  };

  const handlePerformanceTest = async () => {
    setLoading(true);
    
    // Track a performance span
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await LDObserve.startSpan('simulatedApiCall', async (span: any) => {
      // Simulate an API call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
      
      // You can add attributes to the span
      span.setAttributes({
        'api.endpoint': '/test',
        'user.action': 'performance-test'
      });
    });
    
    setLoading(false);
  };

  const handleRecordMetric = () => {
    const startTime = Date.now();
    
    // Simulate some work
    setTimeout(() => {
      const duration = Date.now() - startTime;
      LDObserve.recordGauge({
        name: 'button_click_duration',
        value: duration
      });
    }, 100);
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        LaunchDarkly Observability Demo
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={handleTrackError}
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
        >
          Test Error Tracking
        </button>
        
        <button
          onClick={handleTrackLog}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Test Log Recording
        </button>
        
        <button
          onClick={handlePerformanceTest}
          disabled={loading}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Testing Performance...' : 'Test Performance Tracking'}
        </button>
        
        <button
          onClick={handleRecordMetric}
          className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
        >
          Test Metric Recording
        </button>
      </div>
      
      <div className="text-sm text-gray-600 mt-4">
        <p>
          Click the buttons above to generate observability data. 
          Check your LaunchDarkly dashboard under Sessions, Errors, Logs, or Traces to see the data.
        </p>
      </div>
    </div>
  );
}; 