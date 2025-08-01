export interface MergeFieldItem {
  value: string;
  label: string;
  description: string;
}

export const MERGE_FIELDS: MergeFieldItem[] = [
  {
    value: "{{company_name}}",
    label: "Contact's Company Name",
    description: "Contact's company or business name"
  },
  {
    value: "{{contact_role}}",
    label: "Contact Role",
    description: "Contact's job title or position"
  },
  {
    value: "{{sender_name}}",
    label: "Sender Full Name",
    description: "Your full name as the sender"
  },
  {
    value: "{{sender_first_name}}",
    label: "Sender First Name",
    description: "Your first name"
  },
  {
    value: "{{first_name}}",
    label: "First Name",
    description: "Contact's first name"
  },
  {
    value: "{{last_name}}",
    label: "Last Name",
    description: "Contact's last name"
  },
  {
    value: "{{personal_intro}}",
    label: "Personal Intro",
    description: "Personal introduction message"
  },
  {
    value: "{{custom_proposal}}",
    label: "Custom Proposal",
    description: "Custom proposal or offer"
  },
  {
    value: "{{product1_name}}",
    label: "Product 1 Name",
    description: "First product or service name"
  },
  {
    value: "{{product1_description}}",
    label: "Product 1 Description",
    description: "First product description"
  },
  {
    value: "{{product2_name}}",
    label: "Product 2 Name",
    description: "Second product or service name"
  },
  {
    value: "{{product2_description}}",
    label: "Product 2 Description",
    description: "Second product description"
  },
  {
    value: "{{custom1}}",
    label: "Custom 1",
    description: "Custom field for specific needs"
  },
  {
    value: "{{custom2}}",
    label: "Custom 2",
    description: "Additional custom field"
  },
  {
    value: "{{customer_pain-point}}",
    label: "Customer Pain Point",
    description: "Specific problem or challenge the customer faces"
  }
];