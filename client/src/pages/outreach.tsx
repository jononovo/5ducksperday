import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { List, Company } from "@shared/schema";
import { useState } from "react";

export default function Outreach() {
  const [selectedListId, setSelectedListId] = useState<string>();

  const { data: lists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: [`/api/lists/${selectedListId}/companies`],
    enabled: !!selectedListId,
  });

  // Get the first company from the list
  const currentCompany = companies[0];

  console.log('Selected List ID:', selectedListId);
  console.log('Companies:', companies);
  console.log('Current Company:', currentCompany);

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                List Selection
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

        {/* Right Column */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Outreach Content</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Select a list and company to begin outreach
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}