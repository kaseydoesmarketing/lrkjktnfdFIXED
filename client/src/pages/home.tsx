import { Link } from 'wouter';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <header className="py-16 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Made for Creators. <span className="text-blue-600">Developed by Marketers</span> to Grow YouTube Channels.
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          The only AI-powered A/B testing platform specifically designed to optimize YouTube titles. 
          Increase your click-through rates with scientific precision.
        </p>
        <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-medium transition-colors">
          Start Testing Your Titles Free
        </Link>
      </header>
    </div>
  );
}