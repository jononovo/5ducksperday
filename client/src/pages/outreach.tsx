import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Send, Save, Wand2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { List, Company } from "@shared/schema";
import { useState } from "react";

export default function Outreach() {
  const [selectedListId, setSelectedListId] = useState<string>();
  const [emailPrompt, setEmailPrompt] = useState("");
  const [emailContent, setEmailContent] = useState("");

  const { data: lists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: [`/api/lists/${selectedListId}/companies`],
    enabled: !!selectedListId,
  });

  // Get the first company from the list
  const currentCompany = companies[0];

  const handleSaveEmail = () => {
    // TODO: Implement save functionality
    console.log('Saving email template:', { emailPrompt, emailContent });
  };

  const handleSendEmail = () => {
    // TODO: Implement send functionality
    console.log('Sending email:', { emailPrompt, emailContent });
  };

  const handleGenerateEmail = () => {
    // TODO: Implement email generation
    console.log('Generating email from prompt:', emailPrompt);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedListId}
                onValueChange={setSelectedListId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.listId} value={list.listId.toString()}>
                      List #{list.listId} ({list.resultCount} companies)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Company Summary</h3>
                <Card>
                  <CardContent className="pt-6">
                    {currentCompany ? (
                      <div className="space-y-6">
                        {/* Company Name - More prominent */}
                        <div>
                          <h2 className="text-xl font-semibold mb-1">{currentCompany.name}</h2>
                          {currentCompany.size && (
                            <p className="text-muted-foreground">
                              {currentCompany.size} employees
                            </p>
                          )}
                        </div>

                        {/* Services Section */}
                        <div>
                          <h4 className="font-medium mb-2">Services & Description</h4>
                          {currentCompany.services && currentCompany.services.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                              {currentCompany.services.map((service, index) => (
                                <li key={index} className="text-muted-foreground">{service}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground italic">No services information available</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {selectedListId
                          ? "No companies found in this list"
                          : "Select a list to view company details"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Email Creation */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                </CardTitle>
                <Button onClick={handleGenerateEmail}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Email
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Prompt Field */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Email Creation Prompt
                </label>
                <Textarea
                  placeholder="Enter your prompt for email generation..."
                  value={emailPrompt}
                  onChange={(e) => setEmailPrompt(e.target.value)}
                  className="resize-none"
                  rows={4}
                />
              </div>

              {/* Email Content Field */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Email Content
                </label>
                <Textarea
                  placeholder="Enter or edit the generated email content..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="min-h-[400px]"
                  rows={20}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-end">
                <Button
                  variant="outline"
                  onClick={handleSaveEmail}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
                <Button
                  onClick={handleSendEmail}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}