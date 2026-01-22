import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, ExternalLink, Globe } from "lucide-react";
import type { SearchPlan, TableRow } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow as UITableRow,
} from "@/components/ui/table";

interface SuperSearchResultsProps {
  plan: SearchPlan | null;
  rows: TableRow[];
  isSearching: boolean;
  status: string;
  error: string | null;
  isComplete: boolean;
}

function ResultsTable({ rows, plan }: { rows: TableRow[]; plan: SearchPlan | null }) {
  const columns = plan?.columns || [];
  
  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <UITableRow>
            <TableHead className="min-w-[150px]">Name</TableHead>
            <TableHead className="min-w-[120px]">Website</TableHead>
            {columns.map(col => (
              <TableHead key={col.key} className="min-w-[120px]" title={col.description}>
                {col.label}
              </TableHead>
            ))}
          </UITableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <UITableRow key={index}>
              <TableCell className="font-medium">
                <div>
                  <span>{row.name}</span>
                  {row.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {row.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {row.website ? (
                  <a 
                    href={row.website.startsWith('http') ? row.website : `https://${row.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    <Globe className="h-3 w-3" />
                    {row.website.replace(/^https?:\/\//, '').slice(0, 25)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              {columns.map(col => {
                const value = row.customFields[col.key];
                return (
                  <TableCell key={col.key} className="text-sm">
                    {value !== null && value !== undefined ? (
                      <span>{String(value)}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                );
              })}
            </UITableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SuperSearchResults({
  plan,
  rows,
  isSearching,
  status,
  error,
  isComplete,
}: SuperSearchResultsProps) {
  if (error) {
    return (
      <Card className="border-destructive bg-destructive/10">
        <CardContent className="p-6">
          <p className="text-destructive font-medium">Search Error</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {isSearching && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium text-foreground">AI Search in Progress</p>
                <p className="text-sm text-muted-foreground">{status}</p>
              </div>
            </div>
            {plan && (
              <div className="mt-3 space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">
                    Target: {plan.targetCount} results
                  </Badge>
                  <Badge variant="secondary">
                    Columns: {plan.columns.length}
                  </Badge>
                </div>
                {plan.columns.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Researching: {plan.columns.map(c => c.label).join(', ')}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isComplete && rows.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No results found for your query.</p>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <>
          {isComplete && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">
                  Found {rows.length} results
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                Table View
              </Badge>
            </div>
          )}

          <ResultsTable rows={rows} plan={plan} />
        </>
      )}

      {isSearching && rows.length === 0 && (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
    </div>
  );
}
