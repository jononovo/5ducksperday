import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, Building, Briefcase, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Contact } from '@shared/schema';

export default function AllContacts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const contactsPerPage = 50; // Show 50 contacts per page
  
  // Fetch all contacts
  const { data: contactsData, isLoading } = useQuery<{ total: number; contacts: Contact[] }>({
    queryKey: ['/api/contacts'],
  });

  const contacts = contactsData?.contacts || [];

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(contact => {
    const search = searchTerm.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.role?.toLowerCase().includes(search) ||
      contact.location?.toLowerCase().includes(search)
    );
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);
  const startIndex = (currentPage - 1) * contactsPerPage;
  const endIndex = startIndex + contactsPerPage;
  const paginatedContacts = filteredContacts.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header with back button */}
      <div className="mb-6">
        <Link href="/contacts">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Contact Lists
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-blue-500" />
          <div>
            <h1 className="text-3xl font-bold">All Contacts</h1>
            <p className="text-gray-600 mt-1">
              View and search all {contacts.length} contacts across your system
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, role, or location..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              data-testid="search-contacts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>
              {searchTerm ? `${filteredContacts.length} contacts found` : `All Contacts (${contacts.length})`}
            </span>
            {filteredContacts.length > contactsPerPage && (
              <span className="text-sm text-gray-500 font-normal">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredContacts.length)} of {filteredContacts.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading contacts...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No contacts match your search.' : 'No contacts found.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedContacts.map((contact) => (
                  <TableRow key={contact.id} data-testid={`contact-row-${contact.id}`}>
                    <TableCell className="font-medium">
                      {contact.name || '-'}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a 
                            href={`mailto:${contact.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {contact.email}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(contact as any).companyName ? (
                        <span>{(contact as any).companyName}</span>
                      ) : contact.companyId ? (
                        <span>Company {contact.companyId}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.role || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {contact.location || <span className="text-gray-400">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination Controls */}
            {filteredContacts.length > contactsPerPage && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  {/* Page numbers - show max 5 pages */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      // Adjust page numbers to show around current page
                      if (totalPages > 5) {
                        if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="min-w-[40px]"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}