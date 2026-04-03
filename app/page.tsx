import Link from "next/link";
import { CheckCircle, Shield, Bell, CreditCard } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600">TradeVerify</div>
          <div className="space-x-4">
            <Link href="/login" className="text-gray-600 hover:text-blue-600">
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Get Verified
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Verified Traders You Can Trust
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Join the UK's premier verification platform for professional tradespeople.
          Build trust, win more jobs, and never let your insurance lapse.
        </p>
        <Link
          href="/register"
          className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition"
        >
          Start Your Annual Subscription
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Shield className="w-12 h-12 text-blue-600" />}
            title="Verified Credentials"
            description="Display your verified insurance, certifications, and credentials"
          />
          <FeatureCard
            icon={<Bell className="w-12 h-12 text-blue-600" />}
            title="Expiry Alerts"
            description="Never miss a renewal with 90, 60, and 30-day notifications"
          />
          <FeatureCard
            icon={<CreditCard className="w-12 h-12 text-blue-600" />}
            title="Simple Subscription"
            description="£XX/year - one payment, 12 months of verification"
          />
          <FeatureCard
            icon={<CheckCircle className="w-12 h-12 text-blue-600" />}
            title="Trust Badge"
            description="Get a verified badge to display on your website and marketing"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="1"
              title="Sign Up"
              description="Create your account and choose the annual subscription"
            />
            <Step
              number="2"
              title="Upload Documents"
              description="Submit your insurance policies and certifications"
            />
            <Step
              number="3"
              title="Get Verified"
              description="We verify your credentials and activate your profile"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2026 TradeVerify. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
