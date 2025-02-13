import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function ApiTemplates() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setLocation('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              API Request Templates
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-12">
            {/* Initial Company Search */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Company Search Flow</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium mb-2">Request 1: Search Query</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`POST /api/companies/search
Content-Type: application/json

{
  "query": "mid-sized tech companies in Seattle"
}`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Request 2: Configure Search Approaches</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enable or disable specific analysis approaches before searching.
                  </p>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`PATCH /api/search-approaches/:id
Content-Type: application/json

{
  "active": true,
  "prompt": string // See approach-specific prompts below
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Search Approaches */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Search Approach Templates</h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium mb-2">Company Overview Analysis</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Provide a detailed overview of [COMPANY], including its age, size, and main business focus."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Leadership Analysis</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "List and analyze the key leadership team members of [COMPANY], including their roles and experience."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Contact Discovery</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Find contact information and email addresses for leadership and key decision makers at [COMPANY]."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Market Position</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Analyze the market position, success metrics, and industry standing of [COMPANY]."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Customer Base Analysis</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Research and describe the customer base, target market, and market reach of [COMPANY]."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Online Presence Analysis</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Evaluate the online presence, website metrics, and digital footprint of [COMPANY]."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Services Analysis</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Detail the educational services, programs, and products offered by [COMPANY], particularly in coding and STEM education."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Competitive Analysis</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Compare [COMPANY] with similar educational companies in the market, focusing on their unique selling propositions."`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-md font-medium mb-2">Differentiation Analysis</h4>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                    {`"prompt": "Identify the top 3 unique differentiators that set [COMPANY] apart from competitors. Focus on their competitive advantages and unique value propositions."`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Response Format */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Response Format</h3>
              <p className="text-sm text-muted-foreground mb-2">
                The company search response includes all enabled analysis results in a single response:
              </p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                {`{
  "companies": [
    {
      "id": number,
      "name": string,
      "size": number | null,
      "services": string[] | null,
      "validationPoints": string[] | null,
      "differentiation": string[] | null,
      "totalScore": number,
      "contacts": [
        {
          "name": string,
          "role": string | null,
          "email": string | null,
          "priority": number
        }
      ]
    }
  ],
  "query": string
}`}
              </pre>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-muted-foreground">
                  Notes:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Contact information is included when Leadership Analysis is enabled</li>
                  <li>Services array is populated when Services Analysis is enabled</li>
                  <li>Differentiation points are included when Differentiation Analysis is enabled</li>
                  <li>The totalScore is calculated based on all enabled analyses</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}