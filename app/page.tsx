import { db } from '@/lib/supabase';import Dashboard from './ui';
export const dynamic='force-dynamic';
export default async function Home(){const client=db();const [{data:employees},{data:sales},{data:expenses}]=await Promise.all([client.from('employees').select('*').order('name'),client.from('sales').select('*, salesperson:employees!salesperson_id(name)').order('submitted_at'),client.from('expenses').select('*, reporter:employees!reporter_id(name)').order('submitted_at')]);return <Dashboard employees={employees||[]} sales={sales||[]} expenses={expenses||[]}/>}
