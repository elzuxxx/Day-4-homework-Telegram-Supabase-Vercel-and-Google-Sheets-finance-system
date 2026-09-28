import { createClient } from '@supabase/supabase-js';
const url=process.env.FINANCE_SUPABASE_URL||process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const db=()=>createClient(url,process.env.FINANCE_SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
