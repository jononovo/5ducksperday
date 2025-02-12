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
import type { List } from "@shared/schema";

export default function Outreach() {
  const { data: lists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
  });

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
              <Select>
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
                    <p className="text-muted-foreground">
                      Select a list to view company details
                    </p>
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