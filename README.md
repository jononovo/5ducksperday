npm install
```

2. Push the schema to your database:
```bash
npm run db:push
```

This command will create all necessary tables based on the schema defined in `shared/schema.ts`.

### 3. Storage Architecture
The application uses a modular storage architecture divided into specialized components:

- `storage/index.ts`: Core storage interface definitions
- `storage/database.ts`: Main database storage implementation
- `storage/companies.ts`: Company-related operations
- `storage/contacts.ts`: Contact management and enrichment
- `storage/search.ts`: Search approach configurations
- `storage/campaigns.ts`: Campaign management
- `storage/templates.ts`: Email template handling

Each storage module is responsible for its specific domain and implements the relevant interface methods defined in `storage/index.ts`.

### 4. Default Data Initialization
The application automatically initializes default data when it starts:
- Default search approaches for company analysis
- Sample email templates

This initialization happens through dedicated storage modules:
- `SearchStorage.initializeDefaultSearchApproaches()`
- `TemplateStorage.initializeDefaultEmailTemplates()`

To customize or disable these initializations:
1. Modify the default data arrays in these functions
2. Or comment out their initialization in `storage/database.ts`

## Database Schema
The database schema is defined in `shared/schema.ts` and includes the following tables:
- `lists`: Stores company search lists
- `companies`: Company information and analysis
- `contacts`: Contact information for each company
- `searchApproaches`: Analysis strategies for company research
- `campaigns`: Marketing campaign management
- `emailTemplates`: Reusable email templates

Each table includes important fields for tracking and management:
- Auto-incrementing IDs
- Timestamps for creation and updates
- Proper foreign key relationships

## Development

1. Start the development server:
```bash
npm run dev
```

2. The application will be available at `http://localhost:3000`

## Adding New Database Features

1. Update the schema in `shared/schema.ts`
2. Add corresponding interface methods in `storage/index.ts`
3. Implement the new methods in the appropriate storage module
4. Update the database storage class to delegate to the new implementation
5. Run migration:
```bash
npm run db:push