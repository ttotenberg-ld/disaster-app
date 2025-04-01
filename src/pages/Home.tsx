import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Zap, RefreshCw } from 'lucide-react';

export const Home = () => {
  return (
    <div className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 pb-8 bg-gray-50 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
          <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
            <div className="sm:text-center lg:text-left">
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">Transform your</span>
                <span className="block text-blue-600">digital experience</span>
              </h1>
              <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                Join thousands of users who have already discovered the power of our platform. Start your journey today.
              </p>
              <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                <div className="rounded-md shadow">
                  <Link
                    to="/signup"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                  >
                    Get started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      <div className="bg-gray-100">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-24 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Why choose us?</h2>
          </div>
          <dl className="mt-12 space-y-10 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-8">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <dt className="mt-5 text-lg leading-6 font-medium text-gray-900">Secure by design</dt>
              <dd className="mt-2 text-base text-gray-500 text-center">
                Enterprise-grade security built into every layer
              </dd>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <Zap className="h-6 w-6" />
              </div>
              <dt className="mt-5 text-lg leading-6 font-medium text-gray-900">Lightning fast</dt>
              <dd className="mt-2 text-base text-gray-500 text-center">
                Optimized performance at every step
              </dd>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white">
                <RefreshCw className="h-6 w-6" />
              </div>
              <dt className="mt-5 text-lg leading-6 font-medium text-gray-900">Always up to date</dt>
              <dd className="mt-2 text-base text-gray-500 text-center">
                Regular updates and new features
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};