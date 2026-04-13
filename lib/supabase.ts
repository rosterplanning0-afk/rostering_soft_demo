"// lib/supabase.ts

import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types'; // Assuming types generation later

// !!! IMPORTANT: Read from process.env in a real deployment, but for initial setup, we use placeholders
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser/client-side operations
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);

// Server-side client utility (for API routes)
// For the service role key, we must be careful not to expose it client-side.
export const supabaseServiceClient = createClient<Database>(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Note: Type generation from the schema (Database) must happen after running the Supabase CLI.
"