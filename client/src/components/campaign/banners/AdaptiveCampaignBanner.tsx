import { ActiveCampaignBanner } from './ActiveCampaignBanner';
import { SetupProgressBanner } from './SetupProgressBanner';
import { ActivationCTABanner } from './ActivationCTABanner';

interface AdaptiveCampaignBannerProps {
  isActivated: boolean;
  stats?: {
    currentStreak?: number;
    emailsSentToday?: number;
    emailsSentThisMonth?: number;
    companiesContactedThisMonth?: number;
  };
  hasSenderProfile: boolean;
  hasProduct: boolean;
  hasCustomerProfile: boolean;
  onStartClick?: () => void;
}

export function AdaptiveCampaignBanner({
  isActivated,
  stats,
  hasSenderProfile,
  hasProduct,
  hasCustomerProfile,
  onStartClick
}: AdaptiveCampaignBannerProps) {
  const hasAllComponents = hasSenderProfile && hasProduct && hasCustomerProfile;

  if (!hasAllComponents) {
    return (
      <SetupProgressBanner
        hasSenderProfile={hasSenderProfile}
        hasProduct={hasProduct}
        hasCustomerProfile={hasCustomerProfile}
      />
    );
  }
  
  if (!isActivated) {
    return <ActivationCTABanner onStartClick={onStartClick || (() => {})} />;
  }
  
  return <ActiveCampaignBanner stats={stats || {}} />;
}
