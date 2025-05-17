import React from "react";
import { MainNav } from "@/components/main-nav";
import { Footer } from "@/components/footer";

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <MainNav />
        </div>
      </header>
      <main className="flex-1">
        <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="prose prose-blue max-w-4xl mx-auto dark:prose-invert">
            <h1 className="text-3xl font-bold mb-8 text-center">5Ducks Privacy Policy</h1>
            
            <p className="text-gray-500 text-center mb-12"><strong>Last Updated: May 17, 2025</strong></p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Introduction</h2>
            <p>Welcome to 5Ducks ("we," "our," or "us"). At 5Ducks, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our lead generation platform and related services (collectively, the "Service").</p>
            <p>Please read this Privacy Policy carefully. By accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Information We Collect</h2>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Information You Provide to Us</h3>
            <ul className="list-disc ml-6 mb-4">
              <li><strong>Account Information</strong>: When you register for an account, we collect information associated with your Google account, including your name, email address, profile picture, and Google ID.</li>
              <li><strong>Communication Preferences</strong>: Information about how you customize your email templates and communication settings.</li>
              <li><strong>Search Criteria</strong>: Information about the types of companies, leadership positions, and contacts you are searching for.</li>
              <li><strong>Lists and Saved Data</strong>: Information about the lists you create and the leads you save.</li>
            </ul>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Information We Collect Automatically</h3>
            <ul className="list-disc ml-6 mb-4">
              <li><strong>Usage Data</strong>: Information about how you use our Service, including your interactions with features, pages visited, and actions taken.</li>
              <li><strong>Device Information</strong>: Information about the device you use to access our Service, including IP address, browser type, operating system, and device identifiers.</li>
              <li><strong>Cookies and Similar Technologies</strong>: We use cookies and similar tracking technologies to collect information about your browsing activities and to maintain your session while using our Service.</li>
            </ul>
            
            <h3 className="text-xl font-medium mt-6 mb-3">Information We Receive From Third Parties</h3>
            <ul className="list-disc ml-6 mb-4">
              <li><strong>Google Authentication</strong>: When you sign in with Google, we receive information from Google in accordance with your Google account settings and the permissions you grant us.</li>
              <li><strong>Third-Party Data Sources</strong>: We may collect professional contact information from publicly available sources, business directories, and other legitimate data sources as part of our lead generation services.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">How We Use Your Information</h2>
            <p>We use the information we collect for various purposes, including:</p>
            <ul className="list-disc ml-6 mb-4">
              <li><strong>Providing and Maintaining the Service</strong>: To deliver the features and functionality of our lead generation platform, including searching for companies and contacts, creating lists, and sending emails.</li>
              <li><strong>Account Management</strong>: To create and manage your account, authenticate you, and personalize your experience.</li>
              <li><strong>Communications</strong>: To facilitate your communications with prospects via Gmail, in accordance with your instructions.</li>
              <li><strong>Service Improvement</strong>: To understand how our Service is used, identify areas for improvement, and develop new features.</li>
              <li><strong>Legal Compliance</strong>: To comply with applicable laws, regulations, legal processes, or governmental requests.</li>
              <li><strong>Security and Fraud Prevention</strong>: To detect, prevent, and address fraud, security breaches, and other potentially harmful activities.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">How We Share Your Information</h2>
            <p>We may share your information in the following circumstances:</p>
            <ul className="list-disc ml-6 mb-4">
              <li><strong>With Your Consent</strong>: We may share your information when you direct us to do so or grant us permission, such as when you authorize us to send emails on your behalf via Gmail.</li>
              <li><strong>Service Providers</strong>: We may share your information with third-party vendors, consultants, and other service providers who need access to such information to perform work on our behalf. These service providers include:
                <ul className="list-disc ml-6 mt-2">
                  <li>Anthropic, OpenAI, and Perplexity (AI services)</li>
                  <li>AeroLeads and Hunter.io (lead generation services)</li>
                  <li>AWS (cloud hosting)</li>
                  <li>Replit (development environment)</li>
                </ul>
              </li>
              <li><strong>Business Transfers</strong>: If we are involved in a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction.</li>
              <li><strong>Legal Requirements</strong>: We may disclose your information if required to do so by law or in response to valid requests by public authorities (e.g., a court or a government agency).</li>
              <li><strong>Protection of Rights</strong>: We may disclose your information to protect the rights, property, or safety of 5Ducks, our users, or others.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Your Privacy Rights and Choices</h2>
            <p>Depending on your location, you may have certain rights regarding your personal information. These may include:</p>
            <ul className="list-disc ml-6 mb-4">
              <li><strong>Access and Portability</strong>: You have the right to access the personal information we hold about you and in some cases, receive this information in a structured, commonly used format.</li>
              <li><strong>Correction</strong>: You have the right to request that we correct inaccurate or incomplete personal information we hold about you.</li>
              <li><strong>Deletion</strong>: You have the right to request that we delete your personal information in certain circumstances.</li>
              <li><strong>Restriction and Objection</strong>: You have the right to request that we restrict the processing of your personal information or to object to our processing of your personal information.</li>
              <li><strong>Withdrawal of Consent</strong>: Where we rely on your consent to process your personal information, you have the right to withdraw your consent at any time.</li>
            </ul>
            <p>To exercise these rights, please contact us at <a href="mailto:privacy@5ducks.com" className="text-blue-600 hover:underline dark:text-blue-400">privacy@5ducks.com</a>.</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">California Privacy Rights</h3>
            <p>If you are a California resident, the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA) provide you with specific rights regarding your personal information. This section describes your CCPA/CPRA rights and explains how to exercise those rights.</p>
            
            <h4 className="text-lg font-medium mt-4 mb-2">Categories of Personal Information We Collect</h4>
            <p>We have collected the following categories of personal information from consumers within the last twelve (12) months:</p>
            
            <div className="overflow-x-auto mt-4 mb-6">
              <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-2 border border-gray-300 dark:border-gray-700">Category</th>
                    <th className="px-4 py-2 border border-gray-300 dark:border-gray-700">Examples</th>
                    <th className="px-4 py-2 border border-gray-300 dark:border-gray-700">Collected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Identifiers</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Name, email address, IP address</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Personal information categories listed in the California Customer Records statute</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Name, phone number, address</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Commercial information</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Records of products or services purchased or considered</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Internet or other similar network activity</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Browsing history, search history, information on a consumer's interaction with a website</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Professional or employment-related information</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Current or past job history, professional contacts</td>
                    <td className="px-4 py-2 border border-gray-300 dark:border-gray-700">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h4 className="text-lg font-medium mt-4 mb-2">Sources of Personal Information</h4>
            <p>We obtain the categories of personal information listed above from the following sources:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Directly from you (e.g., from forms you complete or products and services you use)</li>
              <li>Indirectly from you (e.g., from observing your actions on our Service)</li>
              <li>From third-party service providers (e.g., Google authentication)</li>
              <li>From publicly available sources as part of our lead generation services</li>
            </ul>
            
            <h4 className="text-lg font-medium mt-4 mb-2">Use of Personal Information</h4>
            <p>We may use or disclose the personal information we collect for the business purposes described in the "How We Use Your Information" section of this Privacy Policy.</p>
            
            <h4 className="text-lg font-medium mt-4 mb-2">Sharing of Personal Information</h4>
            <p>We may disclose your personal information to a third party for business purposes as described in the "How We Share Your Information" section of this Privacy Policy.</p>
            
            <h4 className="text-lg font-medium mt-4 mb-2">Your Rights and Choices</h4>
            <p>The CCPA/CPRA provides California residents with specific rights regarding their personal information. These rights include:</p>
            <ul className="list-disc ml-6 mb-4">
              <li><strong>Right to Know:</strong> You have the right to request that we disclose certain information to you about our collection and use of your personal information over the past 12 months.</li>
              <li><strong>Right to Delete:</strong> You have the right to request that we delete any of your personal information that we collected from you and retained, subject to certain exceptions.</li>
              <li><strong>Right to Correct:</strong> You have the right to request that we correct inaccurate personal information that we maintain about you.</li>
              <li><strong>Right to Opt-Out of Sale or Sharing:</strong> We do not sell or share personal information as those terms are defined under the CCPA/CPRA.</li>
              <li><strong>Right to Limit Use and Disclosure of Sensitive Personal Information:</strong> We do not use or disclose sensitive personal information for purposes other than those specified under the CCPA/CPRA.</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your CCPA/CPRA rights.</li>
            </ul>
            
            <h4 className="text-lg font-medium mt-4 mb-2">Exercising Your Rights</h4>
            <p>To exercise your rights described above, please submit a verifiable consumer request to us by:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Emailing us at <a href="mailto:quack@5ducks.ai" className="text-blue-600 hover:underline dark:text-blue-400">quack@5ducks.ai</a></li>
            </ul>
            <p>Only you, or a person registered with the California Secretary of State that you authorize to act on your behalf, may make a verifiable consumer request related to your personal information. You may only make a verifiable consumer request for access or data portability twice within a 12-month period.</p>
            <p>We will respond to your request within 45 days of its receipt. If we require more time, we will inform you of the reason and extension period in writing.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Data Security</h2>
            <p>We implement appropriate technical and organizational measures to protect the security of your personal information. However, please understand that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Children's Privacy</h2>
            <p>Our Service is not directed to children under the age of 18, and we do not knowingly collect personal information from children under 18. If we learn we have collected or received personal information from a child under 18 without verification of parental consent, we will delete that information.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">International Data Transfers</h2>
            <p>Your information may be transferred to, and maintained on, computers located outside of your state, province, country, or other governmental jurisdiction where the data protection laws may differ from those in your jurisdiction. If you are located outside the United States and choose to provide information to us, please note that we transfer the information to the United States and process it there.</p>
            
            <h3 className="text-xl font-medium mt-6 mb-3">GDPR Compliance</h3>
            <p>If you are a resident of the European Economic Area (EEA), United Kingdom, or Switzerland, you have certain data protection rights under the General Data Protection Regulation (GDPR) or similar applicable laws. These rights include:</p>
            
            <p><strong>Lawful Basis for Processing:</strong> We process your personal data on the following legal bases:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Consent: Where you have given us explicit consent to process your personal data.</li>
              <li>Contractual Necessity: Where processing is necessary for the performance of a contract with you.</li>
              <li>Legitimate Interests: Where processing is necessary for our legitimate interests, provided those interests do not override your fundamental rights and freedoms.</li>
              <li>Legal Obligation: Where processing is necessary for compliance with a legal obligation.</li>
            </ul>
            
            <p><strong>Data Subject Rights:</strong> In addition to the rights outlined in the "Your Privacy Rights and Choices" section, you have the right to:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Lodge a complaint with a supervisory authority in your country of residence, place of work, or where an alleged infringement of data protection law has occurred.</li>
              <li>Object to processing based on legitimate interests or for direct marketing purposes.</li>
              <li>Not be subject to decisions based solely on automated processing, including profiling, which produces legal or similarly significant effects.</li>
            </ul>
            
            <p><strong>International Transfers:</strong> When we transfer your personal data outside the EEA, UK, or Switzerland, we ensure appropriate safeguards are in place, such as:</p>
            <ul className="list-disc ml-6 mb-4">
              <li>Standard Contractual Clauses approved by the European Commission.</li>
              <li>Binding Corporate Rules for transfers within our corporate group.</li>
              <li>Adequacy decisions by the European Commission, where applicable.</li>
            </ul>
            
            <p><strong>Data Retention:</strong> We retain your personal data only for as long as necessary to fulfill the purposes for which we collected it, including for the purposes of satisfying any legal, accounting, or reporting requirements.</p>
            
            <p><strong>Data Protection Officer:</strong> If you have any questions about our GDPR compliance or wish to exercise your rights, you can contact us at <a href="mailto:quack@5ducks.ai" className="text-blue-600 hover:underline dark:text-blue-400">quack@5ducks.ai</a>.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Changes to This Privacy Policy</h2>
            <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top. You are advised to review this Privacy Policy periodically for any changes.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p className="mb-1"><strong>5Ducks</strong></p>
            <p className="mb-1">Email: <a href="mailto:quack@5ducks.ai" className="text-blue-600 hover:underline dark:text-blue-400">quack@5ducks.ai</a></p>
            <p>Address: 55 Water Street, New York City, 10005 NY</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}