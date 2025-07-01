import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, TrendingUp, Target, BarChart3, Shield, Sparkles, ArrowRight, Star } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  subscriptionStatus?: 'none' | 'pro' | 'authority';
  subscriptionTier?: string;
}

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  error: string | null;
}

export default function Paywall() {
  const [authState, setAuthState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    user: null,
    error: null
  });
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'authority'>('pro');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
          window.location.href = '/login';
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const user = await response.json();
          setAuthState({
            loading: false,
            authenticated: true,
            user,
            error: null
          });

          // If user already has a subscription, redirect to dashboard
          if (user.subscriptionStatus && user.subscriptionStatus !== 'none') {
            window.location.href = '/dashboard';
            return;
          }
        } else {
          throw new Error('Authentication failed');
        }
      } catch (error) {
        setAuthState({
          loading: false,
          authenticated: false,
          user: null,
          error: error instanceof Error ? error.message : 'Authentication failed'
        });
        localStorage.removeItem('sessionToken');
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  const handleSubscribe = async (plan: 'pro' | 'authority') => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('sessionToken');
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create subscription');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription process. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const plans = [
    {
      id: 'pro' as const,
      name: 'Pro',
      price: 29,
      description: 'Perfect for growing creators',
      icon: Zap,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
      features: [
        'Up to 10 A/B tests per month',
        'Real-time performance analytics',
        'YouTube API integration',
        'CTR optimization insights',
        'Title performance tracking',
        'Email support',
        'Mobile app access',
        'Export test results'
      ],
      limits: {
        tests: '10 tests/month',
        videos: 'Unlimited videos',
        analytics: 'Real-time data',
        support: 'Email support'
      }
    },
    {
      id: 'authority' as const,
      name: 'Authority',
      price: 99,
      description: 'For serious content creators',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200',
      popular: true,
      features: [
        'Unlimited A/B tests',
        'Advanced AI-powered insights',
        'Priority YouTube API access',
        'Custom success metrics',
        'Automated title rotation',
        'Priority support & onboarding',
        'Team collaboration features',
        'White-label reporting',
        'Custom integrations',
        'Advanced analytics dashboard',
        'Competitor analysis',
        'Bulk test management'
      ],
      limits: {
        tests: 'Unlimited tests',
        videos: 'Unlimited videos',
        analytics: 'Advanced AI insights',
        support: 'Priority support'
      }
    }
  ];

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 rounded-full animate-spin border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading subscription options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">TitleTesterPro</h1>
                <p className="text-xs text-gray-500 -mt-1">AI-Powered Title Optimization</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Welcome, {authState.user?.name || authState.user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-500">Choose your plan to continue</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-medium text-blue-800 mb-8">
            <Sparkles className="w-4 h-4 mr-2" />
            Premium Title Optimization Platform
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Choose Your
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Growth Plan</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Join thousands of creators who've increased their CTR by 47% with AI-powered title testing.
            Start optimizing your YouTube titles today.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: 'Active Creators', value: '15,000+', icon: Target },
              { label: 'Titles Tested', value: '2.3M+', icon: BarChart3 },
              { label: 'Avg CTR Increase', value: '47%', icon: TrendingUp },
              { label: 'Success Rate', value: '94%', icon: Star }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Professional Plans for Serious Creators
            </h2>
            <p className="text-lg text-gray-600">
              No free plans. Premium tools for premium results.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-gradient-to-br ${plan.bgColor} rounded-2xl border-2 ${
                  plan.popular ? 'border-purple-300 shadow-lg scale-105' : plan.borderColor
                } p-8 transition-all duration-300 hover:shadow-xl`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-sm font-bold">
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <plan.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="flex items-center justify-center mb-2">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-lg text-gray-600 ml-2">/month</span>
                  </div>
                  <p className="text-sm text-gray-500">Billed monthly • Cancel anytime</p>
                </div>

                {/* Plan Limits */}
                <div className="bg-white/50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Plan Includes:</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Tests:</span>
                      <span className="font-medium text-gray-900 ml-1">{plan.limits.tests}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Videos:</span>
                      <span className="font-medium text-gray-900 ml-1">{plan.limits.videos}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Analytics:</span>
                      <span className="font-medium text-gray-900 ml-1">{plan.limits.analytics}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Support:</span>
                      <span className="font-medium text-gray-900 ml-1">{plan.limits.support}</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessing}
                  className={`w-full bg-gradient-to-r ${plan.color} text-white font-bold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Start {plan.name} Plan</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {plan.id === 'authority' && (
                  <p className="text-center text-sm text-gray-600 mt-3">
                    Includes priority onboarding call
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Security & Trust */}
          <div className="text-center mt-16">
            <div className="inline-flex items-center space-x-6 bg-gray-50 rounded-2xl px-8 py-4">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Secure Payment</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">30-Day Guarantee</span>
              </div>
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Premium Support</span>
              </div>
            </div>
            
            <p className="text-sm text-gray-500 mt-4">
              Trusted by 15,000+ creators worldwide. 
              <a href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a> • 
              <a href="/terms" className="text-blue-600 hover:underline ml-1">Terms of Service</a>
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                question: "Why no free plan?",
                answer: "We focus on delivering premium results for serious creators. Our paid plans ensure we can provide the highest quality YouTube API access, AI insights, and dedicated support."
              },
              {
                question: "Can I cancel anytime?",
                answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period."
              },
              {
                question: "Do you offer refunds?",
                answer: "We offer a 30-day money-back guarantee. If you're not satisfied with the results, contact us for a full refund."
              },
              {
                question: "How does the YouTube integration work?",
                answer: "We use official YouTube APIs with OAuth authentication. Your account credentials are securely encrypted and we never store your YouTube password."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600 text-sm">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}