import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function Outreach() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Outreach Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Outreach and communication features will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
