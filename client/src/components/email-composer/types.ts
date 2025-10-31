import type { StrategicProfile } from '@shared/schema';

export interface EmailGenerationControlsProps {
  selectedProduct: number | null;
  selectedProductData: StrategicProfile | null;
  onProductSelect: (product: StrategicProfile) => void;
  onProductClear: () => void;
  selectedTone: string;
  onToneSelect: (toneId: string) => void;
  selectedOfferStrategy: string;
  onOfferStrategySelect: (offerId: string) => void;
  products: StrategicProfile[];
  emailPrompt: string;
  originalEmailPrompt: string;
  onPromptChange: (value: string) => void;
  onPromptResize: () => void;
  promptTextareaRef: React.RefObject<HTMLTextAreaElement>;
  getDisplayValue: (currentValue: string, originalValue?: string) => string;
  onGenerate: () => void;
  isGenerating: boolean;
  drawerMode?: 'compose' | 'campaign';
  generationMode?: 'ai_unique' | 'merge_field';
}

export interface ProductChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface GenerateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export interface TemplateManagerProps {
  templates: any[];
  templatesLoading: boolean;
  onTemplateSelect: (template: any) => void;
  onTemplateSave: (template: any) => void;
  onTemplateUpdate: (template: any) => void;
  onTemplateDelete?: (templateId: number) => void;
  onMergeFieldInsert: (field: string) => void;
  currentContent: string;
  currentSubject: string;
  emailPrompt: string;
  isEditMode: boolean;
  isMergeViewMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
  onMergeViewToggle: () => void;
  selectedContact: any;
  selectedCompany: any;
  user: any;
  editingTemplateId: number | null;
  editingTemplate: any | null;
}

export interface EmailFormProps {
  toEmail: string;
  onToEmailChange: (value: string) => void;
  emailSubject: string;
  onEmailSubjectChange: (value: string) => void;
  emailContent: string;
  onEmailContentChange: (value: string) => void;
  getDisplayValue: (currentValue: string, originalValue?: string) => string;
  drawerMode?: 'compose' | 'campaign';
  campaignRecipients?: any;
  currentQuery?: string | null;
  currentListId?: number | null;
  onRecipientSelect?: (recipients: any) => void;
  onTextareaResize?: () => void;
  emailContentRef?: React.RefObject<HTMLTextAreaElement>;
  toEmailRef?: React.RefObject<HTMLInputElement>;
  emailSubjectRef?: React.RefObject<HTMLInputElement>;
  originalEmailContent?: string;
  originalEmailSubject?: string;
}