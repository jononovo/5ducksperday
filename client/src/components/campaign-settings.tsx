import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
import { ScheduleSendModal } from "@/components/schedule-send-modal";
import { AutopilotModal, type AutopilotSettings } from "@/components/autopilot-modal";
import { format } from "date-fns";
import { Send } from "lucide-react";

export interface CampaignSettingsData {
  scheduleSend: boolean;
  scheduleDate?: Date;
  scheduleTime?: string;
  autopilot: boolean;
  autopilotSettings?: AutopilotSettings;
  trackEmails: boolean;
  unsubscribeLink: boolean;
}

interface CampaignSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: CampaignSettingsData;
  onSettingsChange: (settings: CampaignSettingsData) => void;
  onLaunchCampaign?: () => void;
  className?: string;
  totalRecipients?: number;
}

export function CampaignSettings({ 
  open, 
  onOpenChange,
  settings,
  onSettingsChange,
  onLaunchCampaign,
  className,
  totalRecipients = 100
}: CampaignSettingsProps) {
  const [localSettings, setLocalSettings] = useState<CampaignSettingsData>(settings);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [autopilotModalOpen, setAutopilotModalOpen] = useState(false);

  const handleToggle = (key: keyof CampaignSettingsData, value: boolean) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleScheduleApply = (date: Date, time: string) => {
    // Combine date and time
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    const updated = { 
      ...localSettings, 
      scheduleSend: true,
      scheduleDate: scheduledDate,
      scheduleTime: time 
    };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  const handleAutopilotApply = (autopilotSettings: AutopilotSettings) => {
    const updated = {
      ...localSettings,
      autopilot: true,
      autopilotSettings: autopilotSettings
    };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <>
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
          <div className="space-y-4 pt-2">
            {/* Schedule Send Button */}
            <Button
              variant="ghost"
              className="w-full justify-between h-auto p-2 hover:bg-muted/50"
              onClick={() => setScheduleModalOpen(true)}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-base font-normal">
                  Schedule send
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {localSettings.scheduleSend && localSettings.scheduleDate 
                  ? format(localSettings.scheduleDate, "MMM d, h:mm a")
                  : ''}
              </div>
            </Button>

            {/* Autopilot Button */}
            <Button
              variant="ghost"
              className="w-full justify-between h-auto p-2 hover:bg-muted/50"
              onClick={() => setAutopilotModalOpen(true)}
            >
              <div className="flex items-center gap-3">
                <Wand2 className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-base font-normal">
                    Autopilot
                  </span>
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
              <div className="text-sm text-muted-foreground">
                {localSettings.autopilot && localSettings.autopilotSettings?.maxEmailsPerDay 
                  ? `${localSettings.autopilotSettings.maxEmailsPerDay} per day`
                  : ''}
              </div>
            </Button>

            {/* Track Emails Button */}
            <Button
              variant="ghost"
              className="w-full justify-between h-auto p-2 hover:bg-muted/50"
              onClick={() => handleToggle('trackEmails', !localSettings.trackEmails)}
            >
              <div className="flex items-center gap-3">
                <MailCheck className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-base font-normal">
                    Track emails
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info 
                          className="h-4 w-4 text-muted-foreground cursor-help"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Track when recipients open and click links in your emails</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Switch
                checked={localSettings.trackEmails}
                onCheckedChange={(checked) => handleToggle('trackEmails', checked)}
                className="data-[state=checked]:bg-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
            </Button>

            {/* Unsubscribe Link Button */}
            <Button
              variant="ghost"
              className="w-full justify-between h-auto p-2 hover:bg-muted/50"
              onClick={() => handleToggle('unsubscribeLink', !localSettings.unsubscribeLink)}
            >
              <div className="flex items-center gap-3">
                <Link className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="text-base font-normal">
                    Unsubscribe link
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info 
                          className="h-4 w-4 text-muted-foreground cursor-help"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <p>Add an unsubscribe link to comply with email regulations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <Switch
                checked={localSettings.unsubscribeLink}
                onCheckedChange={(checked) => handleToggle('unsubscribeLink', checked)}
                className="data-[state=checked]:bg-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
            </Button>
          </div>

          {/* Launch Campaign Button */}
          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={onLaunchCampaign}
              className="w-full h-10 bg-green-50 text-green-700 border-green-300 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all duration-300"
              variant="outline"
            >
              <Send className="w-4 h-4 mr-2" />
              Launch Campaign
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>

    {/* Schedule Send Modal */}
    <ScheduleSendModal
      open={scheduleModalOpen}
      onOpenChange={setScheduleModalOpen}
      selectedDate={localSettings.scheduleDate}
      selectedTime={localSettings.scheduleTime || "09:00"}
      onApply={handleScheduleApply}
    />

    {/* Autopilot Modal */}
    <AutopilotModal
      open={autopilotModalOpen}
      onOpenChange={setAutopilotModalOpen}
      settings={localSettings.autopilotSettings || {
        enabled: false,
        days: {
          monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
          saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
          sunday: { enabled: false, startTime: "09:00", endTime: "17:00" }
        },
        maxEmailsPerDay: 300,
        delayBetweenEmails: 3,
        delayUnit: 'minutes'
      }}
      onApply={handleAutopilotApply}
      totalEmails={totalRecipients}
    />
    </>
  );
}