import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CompanyTable from "@/components/company-table";
import PromptEditor from "@/components/prompt-editor";
import SearchApproaches from "@/components/search-approaches";
import { Search } from "lucide-react";

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  const { data: searchApproaches = [] } = useQuery({
    queryKey: ["/api/search-approaches"],
  });

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Business Intelligence Tool</CardTitle>
          </CardHeader>
          <CardContent>
            <PromptEditor 
              onAnalyze={() => setIsAnalyzing(true)}
              onComplete={handleAnalysisComplete}
              isAnalyzing={isAnalyzing}
            />
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search Approaches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SearchApproaches approaches={searchApproaches} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Companies Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CompanyTable companies={companies} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}