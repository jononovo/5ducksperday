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
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Company Search Request</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                {`POST /api/companies/search
Content-Type: application/json

{
  "query": "mid-sized tech companies in Seattle"
}`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Search Approach Configuration</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                {`PATCH /api/search-approaches/:id
Content-Type: application/json

{
  "active": true,
  "prompt": "List and analyze the key leadership team members of [COMPANY], including their roles and experience."
}`}
              </pre>
              <p className="text-sm text-muted-foreground mt-2">
                Note: The [COMPANY] placeholder is automatically replaced with the target company name.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Search Response Format</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                {`{
  "companies": [
    {
      "id": number,
      "name": string,
      "size": number | null,
      "services": string[] | null,
      "validationPoints": string[] | null,
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
              <p className="text-sm text-muted-foreground mt-2">
                When Leadership Analysis is enabled, the response includes detailed contact information in the contacts array.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}