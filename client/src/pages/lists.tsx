import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

export default function Lists() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Company Lists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Company lists and management features will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
