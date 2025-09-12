import { ActiveCampaignBanner } from './ActiveCampaignBanner';
import { SetupProgressBanner } from './SetupProgressBanner';

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
}

export function AdaptiveCampaignBanner({
  isActivated,
  stats,
  hasSenderProfile,
  hasProduct,
  hasCustomerProfile
}: AdaptiveCampaignBannerProps) {
  if (isActivated) {
    return <ActiveCampaignBanner stats={stats || {}} />;
  }

  return (
    <SetupProgressBanner
      hasSenderProfile={hasSenderProfile}
      hasProduct={hasProduct}
      hasCustomerProfile={hasCustomerProfile}
    />
  );
}