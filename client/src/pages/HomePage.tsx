import { Link } from 'wouter';
import { Play, Check, Star, TrendingUp, Zap, Bot, Users, BarChart3, Target, Clock, Award, ChevronRight, ArrowRight, Monitor, Bell, Crown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 glass">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/logo.png" 
                alt="TitleTesterPro Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="text-xl font-bold text-gray-900">TitleTesterPro</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Success Stories</a>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900 transition-colors">Privacy Policy</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">Login</Link>
              <Link href="/login" className="btn-pulse bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Start Pro Plan
              </Link>
            </nav>

            <div className="flex items-center space-x-3 md:hidden">
              <Link href="/login" className="text-gray-600 text-sm">Login</Link>
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium min-w-[88px] text-center">
                Start Pro
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 fade-in">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Built for Creators.{' '}
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Developed by Marketers
                  </span>{' '}
                  to Grow YouTube Channels.
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed">
                  The only AI-powered A/B testing platform specifically designed to optimize YouTube titles. 
                  Increase your click-through rates by 47% with scientific precision. Stop guessing—start winning.
                </p>
              </div>

              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>Trusted by 15,000+ creators</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BarChart3 className="h-4 w-4" />
                  <span>2.3M+ titles tested</span>
                </div>
                <div className="flex items-center space-x-1">
                  <TrendingUp className="h-4 w-4" />
                  <span>47% average CTR improvement</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/login" 
                  className="btn-pulse inline-block bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-8 py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all text-center min-h-[56px] flex items-center justify-center active:scale-95 transform"
                >
                  Start Testing Your Titles Now
                </Link>
                <button className="border border-gray-300 text-gray-700 px-8 py-4 text-lg font-medium rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center justify-center min-h-[56px] active:scale-95 transform">
                  <Play className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Watch 2-Min Demo</span>
                  <span className="sm:hidden">Demo</span>
                </button>
              </div>

              <p className="text-sm text-gray-500">✓ No setup fees • ✓ Cancel anytime • ✓ Setup in 60 seconds</p>
            </div>

            <div className="relative float">
              <div className="relative z-10 rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 card-hover">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Live A/B Test Results</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active Test
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">🏆 "5 Secrets to Viral Content That Actually Work"</p>
                        <p className="text-xs text-gray-500">2,847 impressions • 72 hours testing</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">6.8%</p>
                        <p className="text-xs text-gray-500">CTR</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div>
                        <p className="text-sm font-medium text-gray-900">"How to Create Viral Content on YouTube"</p>
                        <p className="text-xs text-gray-500">2,913 impressions • 72 hours testing</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-600">4.2%</p>
                        <p className="text-xs text-gray-500">CTR</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      🎯 Winner detected with 94% statistical significance • 
                      <span className="text-green-600 font-medium"> +62% improvement in 18 hours</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">47%</div>
              <div className="text-gray-600">Average CTR Increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">2.5M+</div>
              <div className="text-gray-600">Titles Tested</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">15K+</div>
              <div className="text-gray-600">Active Creators</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Turn Titles Into Click Magnets
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <Zap className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Automated Testing</h3>
              <p className="text-gray-600">
                Set it and forget it. We'll rotate your titles automatically
                at your chosen intervals with scientific precision.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <BarChart3 className="h-12 w-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-gray-600">
                Track CTR, views, and engagement metrics instantly. See which
                titles perform best with statistical significance.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <Bot className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">AI-Powered Suggestions</h3>
              <p className="text-gray-600">
                Get niche-specific title suggestions powered by analysis of
                50M+ YouTube videos in your category.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Trusted by Top YouTube Creators
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  MK
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold">Mike Chen</h4>
                  <p className="text-sm text-gray-500">Tech Reviews • 2.1M subs</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "TitleTesterPro helped me increase my CTR by 180% in just 3 weeks. 
                The AI suggestions are incredibly accurate for my tech niche."
              </p>
              <div className="flex text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  SJ
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold">Sarah Johnson</h4>
                  <p className="text-sm text-gray-500">Lifestyle • 850K subs</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "Finally, a tool that takes the guesswork out of titles. My videos 
                now consistently hit 8%+ CTR thanks to their A/B testing."
              </p>
              <div className="flex text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                  DR
                </div>
                <div className="ml-3">
                  <h4 className="font-semibold">David Rodriguez</h4>
                  <p className="text-sm text-gray-500">Gaming • 1.5M subs</p>
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                "Game changer! I went from 3% to 7.2% CTR average. The statistical 
                significance feature ensures I never pick the wrong title again."
              </p>
              <div className="flex text-yellow-400">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Turn Your Titles Into Click Magnets?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join 15,000+ creators who stopped guessing and started winning with data-driven title optimization.
          </p>
          
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 max-w-md mx-auto mb-8">
            <div className="text-white text-left space-y-2">
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>Setup in under 60 seconds</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>Professional A/B testing included</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>14-day money-back guarantee</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="btn-pulse bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-medium rounded-lg shadow-lg transition-colors">
              Start Optimizing Your Titles Now
            </Link>
            <button className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-medium rounded-lg border-2 transition-colors flex items-center justify-center">
              <Play className="h-5 w-5 mr-2" />
              Watch Demo
            </button>
          </div>
          
          <p className="text-blue-200 text-sm mt-6">Join 847 creators who started testing this week</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <img 
              src="/logo.png" 
              alt="TitleTesterPro Logo" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold">TitleTesterPro</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        <div className="text-center mt-4 pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            © 2025 TitleTesterPro • Built for creators, developed by marketers
          </p>
        </div>
      </footer>
    </div>
  );
}
