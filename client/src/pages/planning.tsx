import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { Footer } from "@/components/ui/footer";

export default function Planning() {
  return (
    <div className="min-h-screen flex flex-col">
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
      <Footer />
    </div>
  );
}