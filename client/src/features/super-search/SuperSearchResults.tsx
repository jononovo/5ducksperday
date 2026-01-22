import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, User, MapPin, Globe, Briefcase, Loader2, Sparkles, ExternalLink } from "lucide-react";
import type { SearchPlan, SuperSearchResult, CompanyResult, ContactResult } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SuperSearchResultsProps {
  plan: SearchPlan | null;
  results: SuperSearchResult[];
  isSearching: boolean;
  progress: string;
  error: string | null;
  isComplete: boolean;
}

function CompanyCard({ result }: { result: CompanyResult }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{result.name}</h3>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {result.industry && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3 w-3" />
                  <span>{result.industry}</span>
                </div>
              )}
              {(result.city || result.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{[result.city, result.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {result.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  <a 
                    href={result.website.startsWith('http') ? result.website : `https://${result.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {result.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
            
            {result.superSearchMeta && Object.keys(result.superSearchMeta).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground">AI Research Notes</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(result.superSearchMeta).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium text-foreground">{key}:</span>{' '}
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactCard({ result }: { result: ContactResult }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">{result.name}</h3>
            </div>
            
            <div className="space-y-1 text-sm text-muted-foreground">
              {result.role && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3 w-3" />
                  <span>{result.role}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                <span>{result.company}</span>
              </div>
              {(result.city || result.country) && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  <span>{[result.city, result.country].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {result.linkedinUrl && (
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  <a 
                    href={result.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    LinkedIn Profile
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
            
            {result.superSearchMeta && Object.keys(result.superSearchMeta).length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span className="text-xs font-medium text-muted-foreground">AI Research Notes</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(result.superSearchMeta).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium text-foreground">{key}:</span>{' '}
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableView({ results, columns }: { results: SuperSearchResult[], columns?: string[] }) {
  const defaultColumns = results[0]?.type === 'company' 
    ? ['name', 'industry', 'city', 'country', 'website']
    : ['name', 'role', 'company', 'city', 'country'];
  
  const displayColumns = columns || defaultColumns;
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {displayColumns.map(col => (
              <TableHead key={col} className="capitalize">
                {col.replace(/([A-Z])/g, ' $1').trim()}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result, index) => (
            <TableRow key={index}>
              {displayColumns.map(col => {
                const resultObj = result as unknown as Record<string, unknown>;
                const value = resultObj[col] 
                  || result.superSearchMeta?.[col] 
                  || '-';
                return (
                  <TableCell key={col} className="text-sm">
                    {col === 'website' || col === 'linkedinUrl' ? (
                      value !== '-' ? (
                        <a 
                          href={String(value).startsWith('http') ? String(value) : `https://${value}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          {String(value).replace(/^https?:\/\//, '').slice(0, 30)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : '-'
                    ) : (
                      String(value)
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function SuperSearchResults({
  plan,
  results,
  isSearching,
  progress,
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
                <p className="text-sm text-muted-foreground">{progress}</p>
              </div>
            </div>
            {plan && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <Badge variant="secondary">
                  Mode: {plan.displayMode}
                </Badge>
                <Badge variant="secondary">
                  Target: {plan.targetCount} results
                </Badge>
                <Badge variant="secondary">
                  Type: {plan.queryType}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isComplete && results.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No results found for your query.</p>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <>
          {isComplete && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">
                  Found {results.length} {results[0]?.type === 'company' ? 'companies' : 'contacts'}
                </span>
              </div>
              {plan && (
                <Badge variant="outline" className="text-xs">
                  {plan.displayMode === 'table' ? 'Table View' : 'Card View'}
                </Badge>
              )}
            </div>
          )}

          {plan?.displayMode === 'table' ? (
            <TableView results={results} columns={plan.columns} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {results.map((result, index) => (
                result.type === 'company' ? (
                  <CompanyCard key={index} result={result} />
                ) : (
                  <ContactCard key={index} result={result} />
                )
              ))}
            </div>
          )}
        </>
      )}

      {isSearching && results.length === 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
