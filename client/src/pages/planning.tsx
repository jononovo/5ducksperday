import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { Layout } from "@/components/layout";

export default function Planning() {
  return (
    <Layout>
      <div className="container mx-auto py-8 flex-1">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Planning Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Planning tools and features will be implemented here.</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}