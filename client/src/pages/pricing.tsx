import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Layout } from "@/components/layout";
import { SEOHead } from "@/components/ui/seo-head";
import { trackEvent } from "@/lib/analytics";

const tiers = [
  {
    name: "STARTER",
    price: "$29",
    description: "Perfect for small businesses and startups",
    features: [
      "100 company lookups per month",
      "Basic email finder",
      "Contact verification",
      "Standard support",
      "1 user included"
    ],
    buttonText: "Get 15 Leads Free"
  },
  {
    name: "BUILDER",
    price: "$69",
    description: "Automate all searches and PAID refinements.",
    features: [
      "500 company lookups per month",
      "Advanced email finder",
      "Contact & company enrichment",
      "Priority support",
      "5 users included",
      "Campaign management",
      "Custom templates"
    ],
    highlighted: true,
    buttonText: "Get 10 GOLD Leads Free"
  },
  {
    name: "ACCELERATE",
    price: "$189",
    description: "Automate all searches and PAID refinements.",
    features: [
      "Unlimited company lookups",
      "Advanced AI features",
      "Dedicated account manager",
      "Custom integrations",
      "Unlimited users",
      "API access",
      "SLA agreement",
      "Custom training"
    ],
    buttonText: "Get Busy Now"
  }
];

export default function Pricing() {
  return (
    <Layout>
      <SEOHead 
        title="Pricing Plans - 5Ducks Sales Prospecting"
        description="Choose from our flexible pricing plans starting at $29/month. Get AI-powered contact discovery, email finding, and sales automation tools for your business."
        canonicalUrl="https://5ducks.ai/pricing"
      />
      <div className="container mx-auto py-12 flex-1">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your business intelligence needs. All plans include our core features with different volumes and capabilities.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`relative ${tier.highlighted ? 'border-primary shadow-lg' : ''}`}>
              {tier.highlighted && (
                <div className="absolute -top-4 left-0 right-0 text-center">
                  <span className="bg-primary text-white px-4 py-1 rounded-full text-sm">
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {tier.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full mt-6" 
                  variant={tier.highlighted ? "default" : "outline"}
                  onClick={() => trackEvent('select_plan', 'pricing', tier.name)}
                >
                  {tier.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-4">Enterprise Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Need a custom solution? Our enterprise plan includes advanced features,
            dedicated support, and flexible terms. Contact our sales team to learn more.
          </p>
          <Button 
            variant="outline" 
            className="mt-6"
            onClick={() => trackEvent('contact_enterprise', 'pricing', 'enterprise_inquiry')}
          >
            Contact Enterprise Sales
          </Button>
        </div>
      </div>
    </Layout>
  );
}