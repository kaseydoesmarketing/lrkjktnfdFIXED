import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function LandingSimple() {
  return (
    <div className="min-h-screen bg-white">
      <header className="py-6">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Made for Creators. Developed by Marketers to Grow YouTube Channels.
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            The only AI-powered A/B testing platform specifically designed to optimize YouTube titles.
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/login">Start Testing Your Titles Free</Link>
          </Button>
        </div>
      </header>
    </div>
  );
}