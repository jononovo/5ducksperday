import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// Campaign functionality is currently inactive
// import type { Campaign, InsertCampaign } from "@shared/schema";
// import { insertCampaignSchema } from "@shared/schema";

export default function CampaignDetails() {
  const [, params] = useRoute("/campaigns/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = params?.id === "new";

  // Campaign functionality is currently inactive - using basic form
  const form = useForm({
    // resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      status: "draft",
      campaignId: 0,
      totalCompanies: 0
    },
  });

  const { data: campaign } = useQuery({
    queryKey: [`/api/campaigns/${params?.id}`],
    enabled: !isNew,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: InsertCampaign) => {
      const formattedData = {
        ...data,
        description: data.description || null,
        startDate: data.startDate || null,
        status: "draft"
      };

      console.log('Submitting campaign data:', formattedData);

      const res = await apiRequest(
        isNew ? "POST" : "PATCH",
        `/api/campaigns${isNew ? "" : `/${params?.id}`}`,
        formattedData
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save campaign');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: `Campaign ${isNew ? "Created" : "Updated"}`,
        description: `Campaign has been successfully ${isNew ? "created" : "updated"}.`,
      });
      navigate("/campaigns");
    },
    onError: (error: Error) => {
      console.error('Campaign save error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCampaign) => {
    console.log('Form submitted with data:', data);
    saveMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/campaigns")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Campaigns
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            {isNew ? "Create Campaign" : `Edit Campaign ${campaign?.campaignId}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter campaign name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Enter campaign description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Save className="mr-2 h-4 w-4" />
                {isNew ? "Create Campaign" : "Update Campaign"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}