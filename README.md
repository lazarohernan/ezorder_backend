# EZOrder API

Backend API for the EZOrder application that connects to Supabase for data storage.

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:

   ```
   # Supabase credentials
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-service-role-key

   # API configuration
   PORT=3000
   ```

   You can find your Supabase URL and Service Role Key in your Supabase project dashboard under Project Settings > API.

4. Start the development server:
   ```
   npm run dev
   ```

## Connecting to Supabase

This API uses the Supabase JavaScript client to connect to your Supabase project. The connection is set up in `src/supabase/supabase.ts`.

### Testing the Connection

You can test the connection to Supabase by running the server and visiting:

```
http://localhost:3000/api/health
```

This endpoint will check if the API can successfully connect to your Supabase database.

## Database Setup

To use this API, you'll need to set up the following tables in your Supabase project:

1. Create a `health_check` table for testing the connection:

   ```sql
   CREATE TABLE public.health_check (
     id SERIAL PRIMARY KEY,
     status TEXT NOT NULL,
     timestamp TIMESTAMPTZ DEFAULT now()
   );
   ```

2. Insert a test record:
   ```sql
   INSERT INTO public.health_check (status) VALUES ('ok');
   ```

## API Endpoints

- `GET /`: Welcome message
- `GET /api/health`: Test the connection to Supabase

More endpoints will be added as the API develops.

## Development

To add more Supabase functionality, import the Supabase client in your route files:

```typescript
import { supabase } from "../supabase/supabase";

// Example: Query data
const { data, error } = await supabase.from("your_table").select("*");
```

## License

[MIT](LICENSE)
