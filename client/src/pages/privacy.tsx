import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layout } from "@/components/layout";

export default function Privacy() {
  return (
    <Layout>
      <div className="container mx-auto py-8 flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

            <h2>1. Introduction</h2>
            <p>
              5 Ducks ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI-powered business intelligence platform.
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Personal Information</h3>
            <ul>
              <li>Name and contact information</li>
              <li>Business email address and phone number</li>
              <li>Company name and job title</li>
              <li>Login credentials</li>
              <li>Payment information</li>
            </ul>

            <h3>2.2 Usage Data</h3>
            <ul>
              <li>Search queries and parameters</li>
              <li>Platform interaction data</li>
              <li>Device and browser information</li>
              <li>IP address and location data</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process your transactions</li>
              <li>Improve our platform and user experience</li>
              <li>Send you updates and marketing communications</li>
              <li>Comply with legal obligations</li>
              <li>Detect and prevent fraud</li>
            </ul>

            <h2>4. Gmail API Integration</h2>
            <p>
              Our platform integrates with Gmail API for enhanced communication features. We only access the specific scopes you authorize, and we do not store email content permanently. All email processing is done in accordance with Google's API Services User Data Policy.
            </p>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              You have the right to:
            </p>
            <ul>
              <li>Access your personal information</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to data processing</li>
              <li>Data portability</li>
            </ul>

            <h2>7. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our practices, please contact us at:
            </p>
            <p>
              Email: privacy@5ducks.com<br />
              Address: [Company Address]
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}