DATABASE_URL=postgresql://username:password@host:port/database
PERPLEXITY_API_KEY=your_perplexity_api_key
```

## Database Setup and Migration

### 1. Database Creation
The application requires a PostgreSQL database. You can create one using your preferred method or cloud provider (e.g., Neon, Supabase).

### 2. Schema Migration
The project uses Drizzle ORM for database management. After setting up your database:

1. Install dependencies:
```bash
npm install
```

2. Push the schema to your database:
```bash
npm run db:push
```

This command will create all necessary tables based on the schema defined in `shared/schema.ts`.

### 3. Default Data Initialization
The application automatically initializes default data when it starts:
- Default search approaches for company analysis
- Sample email templates

This initialization happens in `server/storage.ts` through the following functions:
- `initializeDefaultSearchApproaches()`
- `initializeDefaultEmailTemplates()`

To customize or disable these initializations:
1. Modify the default data arrays in these functions
2. Or comment out their calls in the `Promise.all` at the bottom of `storage.ts`

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
2. Add corresponding storage methods in `server/storage.ts`
3. Run migration:
```bash
npm run db:push