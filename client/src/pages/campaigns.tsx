import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function Campaigns() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Campaign Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Campaign management features will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
