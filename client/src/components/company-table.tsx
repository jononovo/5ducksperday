import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import type { Company } from "@shared/schema";

interface CompanyTableProps {
  companies: Company[];
}

export default function CompanyTable({ companies }: CompanyTableProps) {
  const [, navigate] = useLocation();

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Success Score</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">
                <div>
                  <div>{company.name}</div>
                  {company.shortSummary && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {company.shortSummary}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{company.size} employees</TableCell>
              <TableCell>
                <Badge variant={company.totalScore && company.totalScore > 70 ? "default" : "secondary"}>
                  {company.totalScore ?? 'N/A'}
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}