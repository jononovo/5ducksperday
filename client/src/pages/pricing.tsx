import { Helmet } from "react-helmet";

export default function Pricing() {
  return (
    <>
      <Helmet>
        <title>Pricing - 5Ducks</title>
        <meta name="description" content="Simple, transparent pricing for 5Ducks B2B prospecting platform." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600">
              Get started with AI-powered B2B prospecting
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Free</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-3">✓</span>
                  250 credits included
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-3">✓</span>
                  Basic company search
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-3">✓</span>
                  Email templates
                </li>
              </ul>
              <button className="w-full bg-gray-900 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                Get Started Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-blue-600 rounded-2xl shadow-lg p-8 text-white border-2 border-blue-500">
              <h3 className="text-2xl font-bold mb-4">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$49</span>
                <span className="text-blue-200">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <span className="text-blue-200 mr-3">✓</span>
                  Unlimited searches
                </li>
                <li className="flex items-center">
                  <span className="text-blue-200 mr-3">✓</span>
                  Advanced AI insights
                </li>
                <li className="flex items-center">
                  <span className="text-blue-200 mr-3">✓</span>
                  Email campaigns
                </li>
                <li className="flex items-center">
                  <span className="text-blue-200 mr-3">✓</span>
                  Priority support
                </li>
              </ul>
              <button className="w-full bg-white text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}