import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Building2,
  Users,
  Globe,
  Trophy,
  Mail,
  ArrowLeft,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "wouter";
import type { Company, Contact } from "@shared/schema";

export default function CompanyDetails() {
  const [, params] = useRoute("/companies/:id");
  const navigate = useNavigate();

  const { data: company } = useQuery<Company>({
    queryKey: [`/api/companies/${params?.id}`],
  });

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/companies/${params?.id}/contacts`],
  });

  if (!company) {
    return null;
  }

  const metrics = [
    {
      name: "Website Ranking",
      value: company.ranking || 0,
      icon: Globe,
    },
    {
      name: "Company Size",
      value: company.size || 0,
      icon: Users,
    },
    {
      name: "LinkedIn Score",
      value: company.linkedinProminence || 0,
      icon: TrendingUp,
    },
    {
      name: "Customer Count",
      value: company.customerCount || 0,
      icon: Building2,
    },
  ];

  const chartData = [
    { name: "Website Ranking", value: company.ranking || 0 },
    { name: "LinkedIn Score", value: company.linkedinProminence || 0 },
    { name: "Customer Base", value: company.customerCount || 0 },
    { name: "Rating", value: company.rating || 0 },
  ];

  return (
    <div className="container mx-auto py-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Companies
      </Button>

      <div className="grid gap-8">
        {/* Header Section */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">{company.name}</CardTitle>
                <CardDescription>
                  Company Age: {company.age} years
                </CardDescription>
              </div>
              <Badge 
                className="text-lg py-2"
                variant={company.totalScore > 70 ? "default" : "secondary"}
              >
                Score: {company.totalScore}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {metrics.map((metric) => (
                <Card key={metric.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2">
                      <metric.icon className="h-5 w-5 text-muted-foreground" />
                      <p className="text-sm font-medium">{metric.name}</p>
                    </div>
                    <p className="text-2xl font-bold mt-2">{metric.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Services & Validation */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Services Offered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {company.services?.map((service, index) => (
                  <Badge key={index} variant="secondary">
                    {service}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Validation Points</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {company.validationPoints?.map((point, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Contacts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Key Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>{contact.role}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>
                      <Badge variant={contact.priority === 1 ? "default" : "secondary"}>
                        Priority {contact.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
