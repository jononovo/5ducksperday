import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Calendar,
  Wand2,
  Info,
  MailCheck,
  Link
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CampaignSettingsData {
  scheduleSend: boolean;
  scheduleDate?: Date;
  autopilot: boolean;
  autopilotSettings?: {
    dailyLimit: number;
    sendTimePreference: string;
  };
  trackEmails: boolean;
  unsubscribeLink: boolean;
}

interface CampaignSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CampaignSettingsData;
  onSettingsChange: (settings: CampaignSettingsData) => void;
  className?: string;
}

export function CampaignSettings({ 
  open, 
  onOpenChange,
  settings,
  onSettingsChange,
  className 
}: CampaignSettingsProps) {
  const [localSettings, setLocalSettings] = useState<CampaignSettingsData>(settings);

  const handleToggle = (key: keyof CampaignSettingsData, value: boolean) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <Accordion 
      type="single" 
      collapsible 
      value={open ? "settings" : ""}
      onValueChange={(value) => onOpenChange(value === "settings")}
      className={cn("border-t", className)}
    >
      <AccordionItem value="settings" className="border-none">
        <AccordionTrigger className="hover:no-underline py-3">
          <span className="text-lg font-semibold">Settings</span>
        </AccordionTrigger>
        <AccordionContent className="pb-6">
          <div className="space-y-6 pt-2">
            {/* Schedule Send */}
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-md transition-colors"
              onClick={() => {
                // Will open schedule modal in future
                console.log('Open schedule modal');
              }}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-normal cursor-pointer">
                  Schedule send
                </Label>
              </div>
              <div className="text-muted-foreground">
                {localSettings.scheduleSend && localSettings.scheduleDate 
                  ? new Date(localSettings.scheduleDate).toLocaleDateString()
                  : ''}
              </div>
            </div>

            {/* Autopilot */}
            <div 
              className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-md transition-colors"
              onClick={() => {
                // Will open autopilot modal in future
                console.log('Open autopilot modal');
              }}
            >
              <div className="flex items-center gap-3">
                <Wand2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Label className="text-base font-normal cursor-pointer">
                    Autopilot
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info 
                          className="h-4 w-4 text-muted-foreground cursor-help" 
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Automatically send emails at optimal times throughout the day</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <div className="text-muted-foreground">
                {localSettings.autopilot && localSettings.autopilotSettings 
                  ? `${localSettings.autopilotSettings.dailyLimit} per day`
                  : ''}
              </div>
            </div>

            {/* Track Emails */}
            <div className="flex items-center justify-between -mx-2 px-2 py-2">
              <div className="flex items-center gap-3">
                <MailCheck className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Label htmlFor="track-emails" className="text-base font-normal cursor-pointer">
                    Track emails
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Track when recipients open and click links in your emails</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Switch
                id="track-emails"
                checked={localSettings.trackEmails}
                onCheckedChange={(checked) => handleToggle('trackEmails', checked)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {/* Unsubscribe Link */}
            <div className="flex items-center justify-between -mx-2 px-2 py-2">
              <div className="flex items-center gap-3">
                <Link className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Label htmlFor="unsubscribe-link" className="text-base font-normal cursor-pointer">
                    Unsubscribe link
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Add an unsubscribe link to comply with email regulations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Switch
                id="unsubscribe-link"
                checked={localSettings.unsubscribeLink}
                onCheckedChange={(checked) => handleToggle('unsubscribeLink', checked)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}