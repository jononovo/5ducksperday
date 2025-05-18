import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CompanyTable from "@/components/company-table";
import type { List } from "@shared/schema";

export default function ListDetails() {
  const [, params] = useRoute("/lists/:listId");
  const [, navigate] = useLocation();
  const listId = params?.listId ? parseInt(params.listId) : null;

  const { data: list } = useQuery<List>({
    queryKey: [`/api/lists/${listId}`],
    enabled: !!listId,
  });

  const { data: companies = [] } = useQuery({
    queryKey: [`/api/lists/${listId}/companies`],
    enabled: !!listId,
  });

  if (!list) return null;

  // Add a company view handler
  const handleCompanyView = (companyId: number) => {
    console.log('Navigating to company:', { companyId });
    navigate(`/companies/${companyId}`);
  };

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/lists")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Lists
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>List {list.listId}: {list.prompt}</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyTable companies={companies} handleCompanyView={handleCompanyView} />
        </CardContent>
      </Card>
    </div>
  );
}
