import { z } from 'zod';
import { db } from './supabase';
import type { Allocation, Split } from './types';

const cents=(n:number)=>Math.round((n+Number.EPSILON)*100);
const money=(c:number)=>c/100;
export function commissions(amount:number, split:Split) {
 const pool=cents(amount*.1), raw=[split.richard,split.anastasia,split.jeanClaude].map(p=>Math.round(pool*p/100));
 const remainder=pool-raw.reduce((a,b)=>a+b,0);
 const names:['richard','anastasia','jeanClaude']=['richard','anastasia','jeanClaude'];
 const winner=names.reduce((best,n,i)=>split[n]>split[names[best]]?i:best,0); raw[winner]+=remainder;
 return {pool:money(pool),richard:money(raw[0]),anastasia:money(raw[1]),jeanClaude:money(raw[2])};
}
const split=z.object({richard:z.number().min(0).max(100),anastasia:z.number().min(0).max(100),jeanClaude:z.number().min(0).max(100)}).refine(x=>x.richard+x.anastasia+x.jeanClaude===100,'Commission shares must total 100%');
const saleSchema=z.object({reference:z.string().regex(/^S\d+$/),customer:z.string().min(1),project:z.enum(['A','B']),description:z.string().min(1),amount:z.coerce.number().positive(),split});
const expenseSchema=z.object({reference:z.string().regex(/^E\d+$/),description:z.string().min(1),category:z.enum(['Materials','Travel','Other']),amount:z.coerce.number().positive(),allocation:z.enum(['A','B','OVERHEAD'])});
async function employee(id:string){const {data,error}=await db().from('employees').select('*').eq('id',id).single();if(error)throw new Error('Invalid demonstration employee');return data;}
async function dispatch(kind:'sale'|'expense', reference:string){
 const {syncRecord}=await import('./integrations'); try {await syncRecord(kind,reference); await db().from(kind==='sale'?'sales':'expenses').update({sheets_state:'SENT',sheets_error:null}).eq('reference',reference)} catch(e){await db().from(kind==='sale'?'sales':'expenses').update({sheets_state:'FAILED',sheets_error:String(e).slice(0,500)}).eq('reference',reference)}
}
export async function submitSale(actorId:string,input:unknown,source:'web'|'telegram',chatId?:number){
 const actor=await employee(actorId); if(actor.role!=='sales')throw new Error('Only salespeople may submit sales'); const x=saleSchema.parse(input);
 const {error}=await db().from('sales').insert({reference:x.reference,salesperson_id:actor.id,customer:x.customer,project:x.project,description:x.description,amount:x.amount,proposed_richard:x.split.richard,proposed_anastasia:x.split.anastasia,proposed_jean_claude:x.split.jeanClaude,source,origin_chat_id:chatId??actor.telegram_chat_id??null,notification_state:'NOT_APPLICABLE'}); if(error)throw new Error(error.code==='23505'?'This reference already exists':error.message); await dispatch('sale',x.reference); return x;
}
export async function submitExpense(actorId:string,input:unknown,source:'web'|'telegram',chatId?:number){
 const actor=await employee(actorId);if(actor.role!=='expense')throw new Error('Only Kevin may submit expenses');const x=expenseSchema.parse(input);const allocated=x.allocation==='OVERHEAD';
 const {error}=await db().from('expenses').insert({reference:x.reference,reporter_id:actor.id,description:x.description,category:x.category,amount:x.amount,proposed_allocation:x.allocation,final_allocation:allocated?'OVERHEAD':null,status:allocated?'ALLOCATED':'AWAITING_ALLOCATION',source,origin_chat_id:chatId??actor.telegram_chat_id??null,notification_state:'NOT_APPLICABLE'});if(error)throw new Error(error.code==='23505'?'This reference already exists':error.message);await dispatch('expense',x.reference);return x;
}
export async function approveSale(actorId:string,reference:string,finalSplit:Split){const actor=await employee(actorId);if(actor.role!=='manager')throw new Error('Only Svetlana may approve sales');const x=split.parse(finalSplit);const {data:sale,error}=await db().from('sales').select('*').eq('reference',reference).single();if(error)throw new Error('Sale not found');if(sale.status==='APPROVED')return {alreadyApproved:true};const c=commissions(Number(sale.amount),x);const {error:e}=await db().from('sales').update({status:'APPROVED',approved_richard:x.richard,approved_anastasia:x.anastasia,approved_jean_claude:x.jeanClaude,commission_richard:c.richard,commission_anastasia:c.anastasia,commission_jean_claude:c.jeanClaude,decided_at:new Date().toISOString(),decided_by:actor.id,notification_state:sale.origin_chat_id?'PENDING':'NOT_APPLICABLE'}).eq('id',sale.id).eq('status','PENDING');if(e)throw new Error(e.message);await dispatch('sale',reference);await sendDecision('sale',reference);return c}
export async function approveExpense(actorId:string,reference:string,allocation:Allocation){const actor=await employee(actorId);if(actor.role!=='manager')throw new Error('Only Svetlana may allocate expenses');const {data:expense,error}=await db().from('expenses').select('*').eq('reference',reference).single();if(error)throw new Error('Expense not found');if(expense.status==='ALLOCATED')return {alreadyAllocated:true};const {error:e}=await db().from('expenses').update({status:'ALLOCATED',final_allocation:allocation,decided_at:new Date().toISOString(),decided_by:actor.id,notification_state:expense.origin_chat_id?'PENDING':'NOT_APPLICABLE'}).eq('id',expense.id).eq('status','AWAITING_ALLOCATION');if(e)throw new Error(e.message);await dispatch('expense',reference);await sendDecision('expense',reference);return {allocation}}
export async function sendDecision(kind:'sale'|'expense',reference:string){const {notifyRecord}=await import('./integrations');try{await notifyRecord(kind,reference);await db().from(kind==='sale'?'sales':'expenses').update({notification_state:'SENT',notification_error:null}).eq('reference',reference)}catch(e){await db().from(kind==='sale'?'sales':'expenses').update({notification_state:'FAILED',notification_error:String(e).slice(0,500)}).eq('reference',reference)}}
