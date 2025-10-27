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
import { ArrowLeft, Mail, Building, Briefcase, Search, Users } from 'lucide-react';
import type { Contact } from '@shared/schema';

export default function AllContacts() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch all contacts
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-contacts"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacts table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {searchTerm ? `${filteredContacts.length} contacts found` : `All Contacts (${contacts.length})`}
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
                {filteredContacts.map((contact) => (
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
                      {contact.companyId ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span>Company {contact.companyId}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.role ? (
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-gray-400" />
                          <span>{contact.role}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.location || <span className="text-gray-400">-</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}