import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Shield, Zap, TrendingUp, Users, Globe, BarChart } from 'lucide-react';

export default function Paywall() {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: 29,
      icon: Shield,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
      popular: false,
      features: [
        'Up to 5 concurrent A/B tests',
        'Advanced analytics & reporting',
        'Smart title recommendations',
        'YouTube API integration',
        'Email support',
        'Performance insights',
        'CTR optimization tools'
      ]
    },
    {
      id: 'authority',
      name: 'Authority',
      price: 99,
      icon: Crown,
      color: 'bg-gradient-to-br from-purple-600 to-indigo-700',
      popular: true,
      features: [
        'Unlimited A/B tests',
        'Advanced AI title generation',
        'Priority support',
        'Custom analytics dashboard',
        'Bulk test management',
        'API access',
        'Team collaboration tools',
        'White-label reporting',
        'Advanced integrations'
      ]
    }
  ];

  const handleSubscribe = async (planId: string) => {
    setLoading(true);
    setSelectedPlan(planId);

    try {
      const token = localStorage.getItem('sessionToken');
      if (!token) {
        setLocation('/login');
        return;
      }

      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: planId })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      } else {
        alert('Failed to create subscription. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                TitleTesterPro
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              Unlock Your YouTube Potential
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Join 15,000+ creators who've increased their CTR by an average of 47% using our 
            AI-powered title optimization platform. Choose your plan and start growing today.
          </p>
          
          {/* Social Proof */}
          <div className="flex items-center justify-center space-x-8 mt-8">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">15,000+ Creators</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-700">2.3M+ Titles Tested</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">47% Avg CTR Increase</span>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <Card 
                key={plan.id} 
                className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  plan.popular ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-0 right-0">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-2 text-sm font-semibold">
                      ⭐ Most Popular Choice
                    </div>
                  </div>
                )}
                
                <CardHeader className={`${plan.popular ? 'pt-12' : 'pt-6'} pb-4`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-3">
                      <div className={`w-12 h-12 ${plan.color} rounded-xl flex items-center justify-center shadow-lg`}>
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                        <p className="text-sm text-gray-500">Perfect for growing creators</p>
                      </div>
                    </CardTitle>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-gray-500 ml-2">/month</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Billed monthly, cancel anytime</p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading}
                    className={`w-full py-4 text-lg font-semibold transition-all duration-300 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {loading && selectedPlan === plan.id ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Zap className="w-5 h-5" />
                        <span>Start {plan.name} Plan</span>
                      </div>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Secure payment powered by Stripe • Cancel anytime
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Trust Signals */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500 mb-6">Trusted by creators worldwide</p>
          <div className="flex flex-wrap items-center justify-center space-x-8 opacity-60">
            <Globe className="w-8 h-8 text-gray-400" />
            <Shield className="w-8 h-8 text-gray-400" />
            <TrendingUp className="w-8 h-8 text-gray-400" />
            <BarChart className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20">
          <h3 className="text-2xl font-bold text-center mb-10 text-gray-900">
            Frequently Asked Questions
          </h3>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">Yes, you can cancel your subscription at any time. No long-term contracts or cancellation fees.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">How quickly will I see results?</h4>
              <p className="text-gray-600 text-sm">Most creators see CTR improvements within the first week of A/B testing their titles.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Is my YouTube account safe?</h4>
              <p className="text-gray-600 text-sm">Absolutely. We use OAuth authentication and never store your YouTube password. Your account security is our priority.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Do you offer refunds?</h4>
              <p className="text-gray-600 text-sm">We offer a 14-day money-back guarantee if you're not satisfied with the results.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}