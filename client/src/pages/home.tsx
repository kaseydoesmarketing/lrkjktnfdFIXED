import { Link } from 'wouter';
import { Play, Check, Star, TrendingUp, Zap, Bot, Users, BarChart3, Target, Clock, Award, ChevronRight, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 glass">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 glow">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TitleTesterPro</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Success Stories</a>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">Login</Link>
              <Link href="/login" className="btn-pulse bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                Start Testing Titles Free
              </Link>
            </nav>

            <div className="flex items-center space-x-4 md:hidden">
              <Link href="/login" className="text-gray-600">Login</Link>
              <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">
                Start Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Sales Funnel Stage 1: Attention */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 fade-in">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Made for Creators.{' '}
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
                <Link href="/login" className="btn-pulse inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium rounded-lg shadow-lg hover:shadow-xl transition-all text-center">
                  Start Testing Your Titles Now
                </Link>
                <button className="border-gray-300 text-gray-700 px-8 py-4 text-lg font-medium rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center">
                  <Play className="h-5 w-5 mr-2" />
                  Watch 2-Min Demo
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
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full opacity-20 animate-pulse delay-1000"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Agitation Section - Sales Funnel Stage 2: Interest */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-8">Are You Tired of Titles That Get Ignored?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
            <div className="space-y-3">
              <div className="text-red-400 text-4xl">😤</div>
              <h3 className="font-semibold">Guessing Games</h3>
              <p className="text-gray-300">Spending hours crafting titles only to watch them flop with terrible CTR</p>
            </div>
            <div className="space-y-3">
              <div className="text-red-400 text-4xl">📉</div>
              <h3 className="font-semibold">Lost Revenue</h3>
              <p className="text-gray-300">Missing out on millions of views because your titles don't convert</p>
            </div>
            <div className="space-y-3">
              <div className="text-red-400 text-4xl">⏰</div>
              <h3 className="font-semibold">Wasted Time</h3>
              <p className="text-gray-300">Manually testing titles for weeks with no clear winner or data</p>
            </div>
          </div>
          <p className="text-xl text-gray-300 mb-8">
            <strong>The Problem:</strong> 99% of creators use the same generic title formulas that stopped working years ago.
          </p>
          <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium inline-block transition-colors">
            Stop Wasting Time - Start Testing Smart
          </Link>
        </div>
      </section>

      {/* Social Proof - Sales Funnel Stage 3: Desire */}
      <section id="testimonials" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Join 15,000+ Creators Already Dominating Their Niches</h2>
            <p className="text-xl text-gray-600">See how real creators transformed their channels with data-driven title optimization</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="border border-gray-200 card-hover fade-in rounded-lg p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-white font-bold float">
                  TR
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-900 font-medium mb-3">"Increased my CTR from 3.2% to 5.8% in just 2 weeks. My views went from 50K to 200K per video!"</p>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Mike Chen</span> • @TechReviewGuru • 247K subscribers
                  </div>
                  <div className="mt-2 text-sm text-green-600 font-medium">Result: +300% more views</div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 card-hover fade-in rounded-lg p-6" style={{animationDelay: '0.2s'}}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold float" style={{animationDelay: '0.3s'}}>
                  CS
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-900 font-medium mb-3">"Finally, data-driven title optimization that actually works. Hit my first viral video with 2M views!"</p>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Sarah Johnson</span> • @CookingWithSarah • 89K subscribers
                  </div>
                  <div className="mt-2 text-sm text-green-600 font-medium">Result: First viral video (2M views)</div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 card-hover fade-in rounded-lg p-6" style={{animationDelay: '0.4s'}}>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold float" style={{animationDelay: '0.6s'}}>
                  GP
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-900 font-medium mb-3">"TitleTesterPro helped me break 1M views consistently. Now every video performs like my best ones!"</p>
                  <div className="text-sm text-gray-500">
                    <span className="font-medium">Alex Rivera</span> • @GamingPro • 1.2M subscribers
                  </div>
                  <div className="mt-2 text-sm text-green-600 font-medium">Result: Consistent 1M+ view videos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center bg-gray-50 rounded-2xl p-8">
            <div className="space-y-2 count-up">
              <div className="text-3xl font-bold text-gray-900">2,347,891</div>
              <div className="text-sm text-gray-600">A/B Tests Completed</div>
            </div>
            <div className="space-y-2 count-up" style={{animationDelay: '0.2s'}}>
              <div className="text-3xl font-bold text-green-600">+47%</div>
              <div className="text-sm text-gray-600">Average CTR Improvement</div>
            </div>
            <div className="space-y-2 count-up" style={{animationDelay: '0.4s'}}>
              <div className="text-3xl font-bold text-blue-600">72</div>
              <div className="text-sm text-gray-600">Hours to Statistical Significance</div>
            </div>
            <div className="space-y-2 count-up" style={{animationDelay: '0.6s'}}>
              <div className="text-3xl font-bold text-purple-600">94%</div>
              <div className="text-sm text-gray-600">Tests Reach Statistical Significance</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Sales Funnel Stage 4: Conviction */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Turn Titles Into Click Magnets</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              While TubeBuddy does everything, we perfect one thing: titles that convert. Here's why we're different:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white border border-gray-200 card-hover fade-in rounded-lg p-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 glow">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">AI Title Generator (Niche-Specific)</h3>
              <p className="text-gray-600 mb-6">
                Stop using generic title formulas. Our AI analyzes 50M+ YouTube videos in your exact niche to suggest titles proven to drive clicks in your category.
              </p>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="text-sm text-gray-700 space-y-2">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    "5 Secrets That Will Change Your Life"
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    "Why 99% of People Fail (And How You Won't)"
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                    "The Truth About Success Nobody Tells You"
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm font-medium text-blue-600">
                vs TubeBuddy: ❌ Generic suggestions for all niches
              </div>
            </div>

            <div className="bg-white border border-gray-200 card-hover fade-in rounded-lg p-8" style={{animationDelay: '0.2s'}}>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-6 glow" style={{animationDelay: '0.4s'}}>
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Real-Time A/B Testing</h3>
              <p className="text-gray-600 mb-6">
                Test 2-5 titles simultaneously with automatic traffic splitting. Get statistically significant results in 24-72 hours, not weeks of guesswork.
              </p>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Title A (Winner 🏆)</span>
                    <span className="text-sm font-medium text-green-600">6.8% CTR</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-700">Title B</span>
                    <span className="text-sm font-medium text-gray-600">4.2% CTR</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-gray-400 h-2 rounded-full w-1/2"></div>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-sm font-medium text-blue-600">
                vs VidIQ: ❌ No A/B testing capabilities
              </div>
            </div>

            <div className="bg-white border border-gray-200 card-hover fade-in rounded-lg p-8" style={{animationDelay: '0.4s'}}>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-6 glow" style={{animationDelay: '0.6s'}}>
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Statistical Significance Tracking</h3>
              <p className="text-gray-600 mb-6">
                See real statistical significance, not just vanity metrics. Know exactly when you have a winning title with 94%+ confidence.
              </p>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Statistical Confidence</span>
                    <span className="text-sm font-medium text-green-600">94%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{width: '94%'}}></div>
                  </div>
                  <div className="text-xs text-gray-500">Winner detected in 18 hours</div>
                </div>
              </div>
              <div className="mt-4 text-sm font-medium text-blue-600">
                vs Others: ❌ No statistical significance tracking
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-bold text-gray-900">Why TitleTesterPro vs Competition</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">TitleTesterPro</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">TubeBuddy</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">VidIQ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Title A/B Testing</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">✅ Advanced</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">❌ Basic</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">❌ None</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">AI Title Generation</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">✅ Niche-specific</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">❌ Generic</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">❌ Limited</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Statistical Significance</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">✅ Built-in</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">❌ Manual</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">❌ No tracking</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Focus</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">🎯 Title optimization only</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">🔧 Everything (diluted)</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">📊 Analytics focus</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Sales Funnel Stage 5: Action */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Growth Plan</h2>
            <p className="text-xl text-gray-600">Start free, scale as you grow. Cancel anytime, but you won't want to.</p>
            <div className="mt-4 inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              🔥 Limited Time: 847 creators started testing this week
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Pro Tier - Most Popular */}
            <div className="bg-white border-2 border-blue-500 relative rounded-lg p-8 card-hover shadow-xl">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$29</div>
                <p className="text-gray-600">per month • Perfect for serious creators</p>
                <div className="mt-2 text-sm text-green-600 font-medium">Most creators see ROI in first week</div>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">A/B tests included</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Unlimited A/B tests</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Advanced AI title generation</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Statistical significance tracking</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Performance analytics dashboard</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">CSV export for reports</span>
                </li>
              </ul>
              
              <Link href="/login" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium text-center block transition-colors btn-pulse">
                Start with Pro
              </Link>
            </div>

            {/* Authority Tier */}
            <div className="bg-white border border-gray-200 rounded-lg p-8 card-hover">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Authority</h3>
                <div className="text-4xl font-bold text-gray-900 mb-2">$99</div>
                <p className="text-gray-600">per month • For agencies & teams</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Everything in Pro</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Up to 10 YouTube channels</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Team collaboration tools</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">White-label client reports</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Dedicated account manager</span>
                </li>
                <li className="flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  <span className="text-gray-700">Custom integrations</span>
                </li>
              </ul>
              
              <Link href="/login" className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 px-4 rounded-lg font-medium text-center block transition-colors">
                Upgrade to Authority
              </Link>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500 mb-4">All plans include 14-day money-back guarantee</p>
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center">
                <Check className="h-4 w-4 mr-1" />
                No setup fees
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 mr-1" />
                Cancel anytime
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 mr-1" />
                24/7 support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Overcoming Objections */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-xl text-gray-600">Everything you need to know about TitleTesterPro</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How is this different from TubeBuddy or VidIQ?</h3>
              <p className="text-gray-600">While they try to do everything, we perfect one thing: title optimization. We're the only platform with real A/B testing, niche-specific AI, and statistical significance tracking built specifically for YouTube titles.</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">How quickly will I see results?</h3>
              <p className="text-gray-600">Most creators see their first winning title within 24-72 hours. Our fastest user increased CTR by 180% in just 18 hours of testing.</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Do I need technical knowledge?</h3>
              <p className="text-gray-600">Not at all. Simply connect your YouTube channel, enter your video URL, add title variants, and we handle the rest. Most users are testing within 60 seconds.</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Is my YouTube channel data safe?</h3>
              <p className="text-gray-600">Absolutely. We use enterprise-grade encryption and only request minimal permissions needed for title testing. We never access your video content or personal data.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Sales Funnel Stage 6: Close */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to Turn Your Titles Into Click Magnets?</h2>
          <p className="text-xl text-blue-100 mb-6 max-w-2xl mx-auto">
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
                <span>5 free A/B tests included</span>
              </div>
              <div className="flex items-center">
                <Check className="h-5 w-5 text-green-400 mr-3" />
                <span>14-day money-back guarantee</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="btn-pulse bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-medium rounded-lg shadow-lg transition-colors">
              Start Testing Your Titles Free
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
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">TitleTesterPro</span>
              </div>
              <p className="text-gray-400 mb-4">The only tool built specifically for YouTube title optimization. Made for creators, by marketers.</p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Title Optimization Guide</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Case Studies</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">GDPR Compliance</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 sm:mb-0">
              © 2025 TitleTesterPro • Built for creators, by marketers
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}