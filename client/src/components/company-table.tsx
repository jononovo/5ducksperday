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
  handleCompanyView: (companyId: number) => void;
}

export default function CompanyTable({ companies, handleCompanyView }: CompanyTableProps) {
  console.log('CompanyTable received companies:', 
    companies.map(c => ({ id: c.id, name: c.name }))
  );

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            console.log('Rendering company row:', { id: company.id, name: company.name });
            return (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.size ? `${company.size} employees` : ''}</TableCell>
                <TableCell>
                  <Badge variant={company.totalScore && company.totalScore > 70 ? "default" : "secondary"}>
                    {company.totalScore ?? 'N/A'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      console.log('Company view button clicked:', { id: company.id, name: company.name });
                      handleCompanyView(company.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}