import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Target } from "lucide-react";
import { format } from "date-fns";
import type { Campaign } from "@shared/schema";

export default function Campaigns() {
  const [, navigate] = useLocation();
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Campaign Management
            </CardTitle>
            <Button onClick={() => navigate("/campaigns/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Create Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Lists</TableHead>
                <TableHead>Companies</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow 
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => navigate(`/campaigns/${campaign.id}`)}
                >
                  <TableCell>{campaign.campaignId}</TableCell>
                  <TableCell>{campaign.name}</TableCell>
                  <TableCell className="capitalize">{campaign.status}</TableCell>
                  <TableCell>
                    {campaign.createdAt && format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>Loading...</TableCell>
                  <TableCell>Loading...</TableCell>
                </TableRow>
              ))}
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No campaigns yet. Click "Create Campaign" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}