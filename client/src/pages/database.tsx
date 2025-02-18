import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Table, Key, Workflow } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function DatabasePage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Architecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tables" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tables">Tables</TabsTrigger>
              <TabsTrigger value="migrations">Migration Guide</TabsTrigger>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
            </TabsList>

            <TabsContent value="tables" className="space-y-4">
              <ScrollArea className="h-[600px] pr-4">
                {/* Companies Table */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <h3 className="text-lg font-semibold">Companies</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Stores business entity information and metrics
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline" className="w-fit">
                      <Key className="w-3 h-3 mr-1" />
                      id (Primary Key)
                    </Badge>
                    <Badge variant="outline" className="w-fit">name (Required)</Badge>
                    <Badge variant="outline" className="w-fit">website</Badge>
                  </div>
                </div>
                <Separator className="my-4" />

                {/* Contacts Table */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <h3 className="text-lg font-semibold">Contacts</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Professional contact details and verification data
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline" className="w-fit">
                      <Key className="w-3 h-3 mr-1" />
                      id (Primary Key)
                    </Badge>
                    <Badge variant="outline" className="w-fit">company_id (Foreign Key)</Badge>
                    <Badge variant="outline" className="w-fit">name (Required)</Badge>
                  </div>
                </div>
                <Separator className="my-4" />

                {/* Search Approaches Table */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <h3 className="text-lg font-semibold">Search Approaches</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Search configuration and execution logic
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Badge variant="outline" className="w-fit">
                      <Key className="w-3 h-3 mr-1" />
                      id (Primary Key)
                    </Badge>
                    <Badge variant="outline" className="w-fit">name (Required)</Badge>
                    <Badge variant="outline" className="w-fit">module_type</Badge>
                  </div>
                </div>
                <Separator className="my-4" />

                {/* Additional tables... */}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="migrations" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Migration Process</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Workflow className="w-4 h-4" />
                      <p className="text-sm">1. Update schema in shared/schema.ts</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Workflow className="w-4 h-4" />
                      <p className="text-sm">2. Run npm run db:push</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Workflow className="w-4 h-4" />
                      <p className="text-sm">3. Verify changes in application</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Best Practices</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Never write manual SQL migrations</li>
                    <li>Use Drizzle's schema-push functionality</li>
                    <li>Handle data loss warnings appropriately</li>
                    <li>Test changes in development first</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="architecture" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Project Structure</h3>
                  <pre className="bg-muted p-4 rounded-lg text-sm">
{`shared/
└── schema.ts     # Database schemas and types

server/
├── storage/      # Database operations
│   ├── search.ts
│   ├── companies.ts
│   └── ...
└── db.ts        # Database connection`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Key Components</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Drizzle ORM for database operations</li>
                    <li>PostgreSQL as the database engine</li>
                    <li>Zod for schema validation</li>
                    <li>Type-safe database operations</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}