import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Footer } from "@/components/ui/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Phone,
  Twitter,
  UserCircle,
  Link as LinkIcon,
  Building,
} from "lucide-react";
import type { Contact, Company } from "@shared/schema";

export default function ContactDetails() {
  const [, params] = useRoute("/contacts/:id");
  const [, navigate] = useLocation();
  const contactId = params?.id ? parseInt(params.id) : null;

  console.log('ContactDetails - Loading contact ID:', contactId);

  const { data: contact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: [`/api/contacts/${contactId}`],
    enabled: !!contactId
  });

  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: [`/api/companies/${contact?.companyId}`],
    enabled: !!contact?.companyId
  });

  // Show loading state
  if (contactLoading || companyLoading) {
    return (
      <div className="container mx-auto py-8">
        <p>Loading contact details...</p>
      </div>
    );
  }

  // Show not found state
  if (!contact && !contactLoading) {
    return (
      <div className="container mx-auto py-8">
        <p>Contact not found. ID: {contactId}</p>
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto py-8 flex-1">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>

        <div className="grid gap-6">
          {/* Contact Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    <UserCircle className="h-6 w-6" />
                    {contact.name}
                  </CardTitle>
                  <CardDescription>
                    {contact.role} at {company?.name}
                  </CardDescription>
                </div>
                <Badge variant={
                  (contact.probability || 0) >= 90 ? "default" :
                  (contact.probability || 0) >= 70 ? "secondary" : "outline"
                }>
                  {contact.probability || 0}% match
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="w-[200px]">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email
                      </div>
                    </TableCell>
                    <TableCell>{contact.email || "Not available"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone
                      </div>
                    </TableCell>
                    <TableCell>{contact.phoneNumber || "Not available"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        Department
                      </div>
                    </TableCell>
                    <TableCell>{contact.department || "Not available"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Location
                      </div>
                    </TableCell>
                    <TableCell>{contact.location || "Not available"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        LinkedIn
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.linkedinUrl ? (
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View Profile
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Twitter className="h-4 w-4 text-muted-foreground" />
                        Twitter
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.twitterHandle ? (
                        <a
                          href={`https://twitter.com/${contact.twitterHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          @{contact.twitterHandle}
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Company Information */}
          {company && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">About {company.name}</h3>
                    <p className="text-muted-foreground mt-1">
                      {company.size} employees • Score: {company.totalScore ?? 'N/A'}
                    </p>
                  </div>

                  {company.services && company.services.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Services</h3>
                      <div className="flex flex-wrap gap-2">
                        {company.services.map((service, index) => (
                          <Badge key={index} variant="secondary">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={() => navigate(`/companies/${company.id}`)}
                  >
                    View Company Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}