import React, { useEffect, useState } from 'react';
import { Chrome, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExtensionSetup() {
  const [userId, setUserId] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('userId');
    if (userIdParam) {
      setUserId(userIdParam);
    }
  }, []);

  const handleConnect = async () => {
    if (!userId.trim()) {
      alert('Please enter a valid User ID');
      return;
    }

    try {
      if (window.chrome && window.chrome.storage) {
        await window.chrome.storage.local.set({ userId: userId.trim() });
        setIsConnected(true);
        
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        alert('This page must be opened from the Chrome extension');
      }
    } catch (error) {
      console.error('Failed to connect extension:', error);
      alert('Failed to connect extension. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8">
        <div className="text-center mb-6">
          <Chrome className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Extension
          </h1>
          <p className="text-gray-600">
            Connect your TitleTesterPro extension to start collecting analytics data
          </p>
        </div>

        {!isConnected ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your user ID"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can find your User ID in your dashboard settings
              </p>
            </div>

            <button
              onClick={handleConnect}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Connect Extension
            </button>
          </div>
        ) : (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Extension Connected!
            </h2>
            <p className="text-gray-600 mb-4">
              Your extension is now connected and ready to collect analytics data.
            </p>
            <p className="text-sm text-gray-500">
              This window will close automatically...
            </p>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                How it works
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Extension collects CTR data from YouTube Studio</li>
                  <li>Data is sent securely to TitleTesterPro</li>
                  <li>Analytics are used for A/B test results</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
