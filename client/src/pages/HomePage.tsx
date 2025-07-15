import { Link } from 'wouter';
import { Play, BarChart3, Zap, ArrowRight, CheckCircle, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Play className="h-8 w-8 text-red-600 fill-current" />
              <span className="text-2xl font-bold">TitleTesterPro</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                Privacy
              </Link>
              <Link href="/auth/signin">
                <Button variant="default" className="bg-red-600 hover:bg-red-700">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Optimize Your YouTube Titles with
            <span className="text-red-600"> A/B Testing</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Test multiple title variants automatically and discover which ones drive
            the most views, clicks, and engagement. Join successful creators who've
            increased their CTR by up to 312%.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="bg-red-600 hover:bg-red-700">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline">
                See How It Works
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">47%</div>
              <div className="text-gray-600">Average CTR Increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">2.5M+</div>
              <div className="text-gray-600">Titles Tested</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-red-600 mb-2">15K+</div>
              <div className="text-gray-600">Active Creators</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Optimize Your Titles
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <Zap className="h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Automated Testing</h3>
              <p className="text-gray-600">
                Set it and forget it. We'll rotate your titles automatically
                at your chosen intervals.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <BarChart3 className="h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
              <p className="text-gray-600">
                Track CTR, views, and engagement metrics instantly. See which
                titles perform best.
              </p>
            </Card>
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <TrendingUp className="h-12 w-12 text-red-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Statistical Significance</h3>
              <p className="text-gray-600">
                Know when you have enough data to confidently pick a winner.
                No more guessing.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Increase Your Video Performance?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of creators who are already optimizing their titles with data.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" variant="secondary" className="bg-white text-red-600 hover:bg-gray-100">
              Start Your Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Play className="h-6 w-6 text-red-600 fill-current" />
            <span className="font-semibold">TitleTesterPro</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-600">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
