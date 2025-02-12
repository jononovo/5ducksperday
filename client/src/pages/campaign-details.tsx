import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { insertCampaignSchema, type Campaign, type List } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CampaignDetails() {
  const [, params] = useRoute("/campaigns/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);

  // Get campaign data if editing
  const { data: campaign } = useQuery<Campaign>({
    queryKey: [`/api/campaigns/${params?.id}`],
    enabled: !!params?.id,
  });

  // Get lists if editing a campaign
  const { data: campaignLists = [] } = useQuery<List[]>({
    queryKey: [`/api/campaigns/${params?.id}/lists`],
    enabled: !!params?.id,
  });

  // Form setup
  const form = useForm({
    resolver: zodResolver(insertCampaignSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "draft",
      startDate: undefined,
    },
  });

  // Set form values when editing
  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        description: campaign.description || "",
        status: campaign.status,
        startDate: campaign.startDate ? new Date(campaign.startDate) : undefined,
      });
    }
  }, [campaign, form]);

  // Handle lists from URL when creating
  useEffect(() => {
    if (!params?.id) {
      const searchParams = new URLSearchParams(window.location.search);
      const lists = searchParams.get('lists');
      if (lists) {
        setSelectedListIds(lists.split(',').map(Number));
      }
    } else if (campaignLists.length > 0) {
      setSelectedListIds(campaignLists.map(list => list.listId));
    }
  }, [params?.id, campaignLists]);

  // Create/Update campaign
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        lists: selectedListIds,
      };

      const res = await apiRequest(
        params?.id ? "PATCH" : "POST",
        params?.id ? `/api/campaigns/${params.id}` : "/api/campaigns",
        payload
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: `Campaign ${params?.id ? "updated" : "created"}`,
        description: `Campaign has been successfully ${params?.id ? "updated" : "created"}.`,
      });
      navigate("/campaigns");
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to ${params?.id ? "update" : "create"} campaign`,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Make sure to include the campaign status if we're updating
    const submissionData = {
      ...data,
      status: campaign?.status || 'draft',
    };
    mutation.mutate(submissionData);
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>
                {params?.id ? "Edit Campaign" : "Create New Campaign"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter campaign name" {...field} />
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
                        placeholder="Enter campaign description"
                        {...field}
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lists in Campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>List ID</TableHead>
                    <TableHead>Search Prompt</TableHead>
                    <TableHead>Results</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignLists.map((list) => (
                    <TableRow key={list.id}>
                      <TableCell>{list.listId}</TableCell>
                      <TableCell>{list.prompt}</TableCell>
                      <TableCell>{list.resultCount}</TableCell>
                    </TableRow>
                  ))}
                  {campaignLists.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center text-muted-foreground"
                      >
                        No lists added to this campaign yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-[200px]"
            >
              {mutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {params?.id ? "Update Campaign" : "Create Campaign"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}