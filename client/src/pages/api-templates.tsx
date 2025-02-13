import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2 } from "lucide-react";

export default function ApiTemplates() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            API Request Templates
          </CardTitle>
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
