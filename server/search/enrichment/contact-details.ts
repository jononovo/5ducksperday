/**
 * Contact Details Enrichment Module
 * 
 * Uses Perplexity AI to find professional contact information including emails
 */

import { queryPerplexity } from "../perplexity/perplexity-client";
import { isPlaceholderEmail } from "../analysis/email-analysis";

// Define the Perplexity message type locally since the main type file is missing
interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ContactDetails {
  email: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  phoneNumber: string | null;
  department: string | null;
  location: string | null;
}

/**
 * Search for contact details using Perplexity AI
 * This is the primary function for AI-powered email discovery
 */
export async function searchContactDetails(name: string, company: string): Promise<ContactDetails> {
  try {
    console.log(`[Perplexity] Searching for contact details: ${name} at ${company}`);
    
    const messages: PerplexityMessage[] = [
      {
        role: "system",
        content: `You are a contact information researcher. Find professional information about the specified person. Include:
        1. Professional email
        2. LinkedIn URL
        3. Location (city, state/country)

        IMPORTANT: If you cannot find data, leave fields empty. Do NOT make up data.

        Format your response as JSON with these exact keys:
        {
          "professional_email": "string or empty", 
          "linkedin_url": "string or empty",
          "location": "string or empty"
        }`
      },
      {
        role: "user",
        content: `Find professional contact information for ${name} at ${company}.`
      }
    ];

    const response = await queryPerplexity(messages);
    console.log(`[Perplexity] Raw response for ${name}:`, response);

    // Parse the response
    let parsedData: any = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
        console.log(`[Perplexity] Parsed JSON data:`, parsedData);
      } else {
        console.log(`[Perplexity] No JSON found in response`);
      }
    } catch (parseError) {
      console.error(`[Perplexity] Failed to parse response as JSON:`, parseError);
      // Try to extract email using regex as fallback
      const emailMatch = response.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      if (emailMatch) {
        parsedData.professional_email = emailMatch[0];
        console.log(`[Perplexity] Extracted email via regex:`, emailMatch[0]);
      }
    }

    // Extract and validate the email
    const foundEmail = parsedData.professional_email || parsedData.email || null;
    
    // Check if the email is valid (not masked or placeholder)
    let validatedEmail: string | null = null;
    if (foundEmail) {
      if (isPlaceholderEmail(foundEmail)) {
        console.log(`[Perplexity] ⚠️ Found masked/placeholder email for ${name}: ${foundEmail} - treating as not found`);
      } else {
        validatedEmail = foundEmail;
      }
    }
    
    // Extract and format the data
    const contactDetails: ContactDetails = {
      email: validatedEmail,
      linkedinUrl: parsedData.linkedin_url || parsedData.linkedinUrl || null,
      twitterHandle: parsedData.twitter_handle || parsedData.twitterHandle || null,
      phoneNumber: parsedData.phone_number || parsedData.phoneNumber || null,
      department: null, // Department is not requested in enrichment since role is already obtained in discovery
      location: parsedData.location || null
    };

    // Log what we found
    if (contactDetails.email) {
      console.log(`[Perplexity] ✅ Found valid email for ${name}: ${contactDetails.email}`);
    } else {
      console.log(`[Perplexity] ❌ No valid email found for ${name}`);
    }

    return contactDetails;

  } catch (error) {
    console.error(`[Perplexity] Error searching for ${name} at ${company}:`, error);
    // Return empty details on error
    return {
      email: null,
      linkedinUrl: null,
      twitterHandle: null,
      phoneNumber: null,
      department: null,
      location: null
    };
  }
}