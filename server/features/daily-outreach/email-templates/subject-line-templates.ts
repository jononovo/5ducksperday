import { DailyBatch } from '../types';

const SUBJECT_TEMPLATES = [
  "Don't miss out on emailing [first_name] from [company_name] and 4 others",
  "What if [first_name] from [company_name] becomes your largest customer?",
  "[first_name] from [company_name] and 4 others are waiting to hear from you",
  "You'll never regret taking baby steps. Write [first_name] from [company_name] today",
  "Your company won't grow itself. Email [first_name] from [company_name] now",
  "It's time to email your best future customer: [first_name] from [company_name] or one of the other 4"
];

export function getRandomSubjectLine(batch: DailyBatch): string {
  const firstContact = batch.items?.[0];
  if (!firstContact) return "Your daily outreach contacts are ready!";
  
  const firstName = firstContact.contact.name.split(' ')[0] || firstContact.contact.name;
  const companyName = firstContact.company.name;
  
  const template = SUBJECT_TEMPLATES[Math.floor(Math.random() * SUBJECT_TEMPLATES.length)];
  
  return template
    .replace('[first_name]', firstName)
    .replace('[company_name]', companyName);
}