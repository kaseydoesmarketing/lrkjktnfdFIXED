import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  PlayCircle, 
  TrendingUp, 
  BarChart3, 
  Clock, 
  Target, 
  CheckCircle,
  ArrowRight,
  Users,
  Zap,
  Shield
} from "lucide-react";
import heroImage from "@assets/4DE9BFEB-EEEB-4EDE-B30E-5453C05714C6_1750286981502.png";
import logoWhite from "@assets/9C82A0A6-B151-41BB-953A-513AC09CBEFD_1750286981502.png";
import logoRed from "@assets/2392070F-42C6-416A-ABCA-837B1117C4EA_1750286981502.png";
import newLogo from "@assets/Untitled design (11)_1750353468294.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={newLogo} alt="TitleTesterPro" className="h-12" />
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/privacy" className="text-sm text-gray-300 hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/login">
              <Button className="bg-red-500 hover:bg-red-600 text-white">
                Start Testing
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 text-center">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <Badge className="mb-6 bg-red-900/20 text-red-400 hover:bg-red-900/20">
                Made for Creators
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Made for creators,<br />
                <span className="text-red-500">developed by marketers</span><br />
                to grow YouTube<br />
                channels.
              </h1>
              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Stop guessing which titles work. TitleTesterPro automatically tests your video titles 
                on real YouTube videos and shows you which ones drive the most views and engagement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/login">
                  <Button size="lg" className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 text-lg">
                    Start Testing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="px-8 py-4 text-lg border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                  onClick={() => window.open('https://youtu.be/UCNzlHmYGD4', '_blank')}
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              
              <div className="mt-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
                <p className="text-sm text-gray-300">
                  <Shield className="inline-block w-4 h-4 mr-2 text-blue-400" />
                  Your data privacy is our priority. We only access YouTube analytics data you explicitly authorize. 
                  Learn more in our{' '}
                  <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline font-medium">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="relative">
              <img 
                src={heroImage} 
                alt="TitleTesterPro Dashboard" 
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full font-semibold">
                Live Testing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-red-500 text-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-red-100">Titles Tested</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-red-100">Active Creators</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">25%</div>
              <div className="text-red-100">Avg CTR Increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">2M+</div>
              <div className="text-red-100">Views Optimized</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything you need to optimize your titles
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our platform handles the entire A/B testing process automatically, 
              so you can focus on creating great content while we optimize your reach.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Automatic Testing</h3>
                <p className="text-gray-400">
                  Set up once and let our system automatically rotate your titles and collect performance data.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Real-Time Analytics</h3>
                <p className="text-gray-400">
                  Track CTR, view duration, and engagement metrics as your tests run on live YouTube videos.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 hover:bg-gray-750">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Smart Scheduling</h3>
                <p className="text-gray-200">
                  Configure rotation intervals and let our scheduler handle the timing for optimal testing.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 hover:bg-gray-750">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Winner Detection</h3>
                <p className="text-gray-200">
                  Statistical analysis automatically identifies the best-performing titles with confidence scores.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 hover:bg-gray-750">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-orange-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Channel Integration</h3>
                <p className="text-gray-200">
                  Connect your YouTube channel and select from your recent videos to start testing immediately.
                </p>
              </CardContent>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow bg-gray-800 border-gray-700 hover:bg-gray-750">
              <CardContent className="p-0">
                <div className="w-12 h-12 bg-teal-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Safe & Secure</h3>
                <p className="text-gray-200">
                  Your YouTube credentials are encrypted and secure. We only access what's needed for testing.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-300">
              Get started with title testing in just a few simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Connect Your Channel</h3>
              <p className="text-gray-300">
                Sign in with your YouTube account and grant permissions for title testing and analytics access.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Create Your Test</h3>
              <p className="text-gray-300">
                Choose a video, add 2-5 title variants, set your rotation schedule and success metrics.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">Watch Results</h3>
              <p className="text-gray-300">
                Monitor real-time performance data and get notified when we find your winning title.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Trusted by top creators
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-white">Mike Chen</div>
                    <div className="text-gray-300">Tech Reviewer • 2.5M subs</div>
                  </div>
                </div>
                <p className="text-gray-200 italic">
                  "TitleTesterPro increased my average CTR by 32%. The automatic testing saves me hours 
                  of manual work and the results speak for themselves."
                </p>
              </CardContent>
            </Card>

            <Card className="p-8 bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    S
                  </div>
                  <div className="ml-4">
                    <div className="font-semibold text-white">Sarah Williams</div>
                    <div className="text-gray-300">Lifestyle Creator • 850K subs</div>
                  </div>
                </div>
                <p className="text-gray-200 italic">
                  "Finally, a tool that tests titles on actual YouTube videos. The insights have 
                  completely changed how I approach content optimization."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Ready to optimize your titles?
          </h2>
          <p className="text-xl mb-8 text-red-100">
            Join thousands of creators who are already growing their channels with data-driven title optimization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-white text-red-500 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
                Start Your Free Test
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg"
              onClick={() => window.open('https://youtu.be/UCNzlHmYGD4', '_blank')}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>
          <p className="text-sm text-red-100 mt-6">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <img src={logoWhite} alt="TitleTesterPro" className="h-8 mb-4" />
              <p className="text-gray-400">
                The professional title testing platform for YouTube creators who want to grow their channels with data.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-2 text-gray-400">
                <div>Features</div>
                <div>Pricing</div>
                <div>API</div>
                <div>Security</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <div className="space-y-2 text-gray-400">
                <div>Documentation</div>
                <div>Tutorials</div>
                <div>Case Studies</div>
                <div>Blog</div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-2 text-gray-400">
                <div>About</div>
                <div>Contact</div>
                <Link href="/privacy" className="block hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="block hover:text-white transition-colors">Terms</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center space-x-6">
                <Link href="/privacy" className="text-sm text-blue-400 hover:text-white transition-colors font-medium">
                  Privacy Policy
                </Link>
                <span className="text-gray-600">•</span>
                <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </div>
              <p className="text-center text-gray-400">&copy; 2025 TitleTesterPro. All rights reserved.</p>
              <p className="text-xs text-gray-500">
                Contact: <a href="mailto:kaseydoesmarketing@gmail.com" className="hover:text-gray-400">kaseydoesmarketing@gmail.com</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}