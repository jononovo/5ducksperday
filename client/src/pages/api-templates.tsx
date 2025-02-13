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
  "query": "mid-sized plumbers in Atlanta"
}`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Search Approach Update</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                {`PATCH /api/search-approaches/:id
Content-Type: application/json

{
  "active": boolean,
  "prompt": "string"
}`}
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Response Format</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                {`{
  "companies": [
    {
      "id": number,
      "name": string,
      "size": number | null,
      "services": string[] | null,
      "validationPoints": string[] | null,
      "totalScore": number
    }
  ],
  "query": string
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}