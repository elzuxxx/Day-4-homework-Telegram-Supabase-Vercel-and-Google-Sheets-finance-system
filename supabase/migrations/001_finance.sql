create extension if not exists pgcrypto;
create type employee_role as enum ('sales','expense','manager');
create type project_code as enum ('A','B');
create type expense_category as enum ('Materials','Travel','Other');
create type allocation_code as enum ('A','B','OVERHEAD');
create type sale_status as enum ('PENDING','APPROVED');
create type expense_status as enum ('AWAITING_ALLOCATION','ALLOCATED');
create type delivery_state as enum ('PENDING','SENT','FAILED','NOT_APPLICABLE');

create table employees (
 id uuid primary key default gen_random_uuid(), name text not null unique,
 role employee_role not null, telegram_user_id bigint unique, telegram_chat_id bigint,
 created_at timestamptz not null default now()
);
insert into employees (name,role) values
 ('Richard','sales'),('Anastasia','sales'),('Jean-Claude','sales'),('Kevin','expense'),('Svetlana','manager');

create table sales (
 id uuid primary key default gen_random_uuid(), reference text not null unique check (reference ~ '^S[0-9]+$'),
 submitted_at timestamptz not null default now(), salesperson_id uuid not null references employees(id),
 customer text not null, project project_code not null, description text not null, amount numeric(12,2) not null check(amount>0),
 proposed_richard numeric(5,2) not null check(proposed_richard between 0 and 100), proposed_anastasia numeric(5,2) not null check(proposed_anastasia between 0 and 100), proposed_jean_claude numeric(5,2) not null check(proposed_jean_claude between 0 and 100),
 approved_richard numeric(5,2), approved_anastasia numeric(5,2), approved_jean_claude numeric(5,2),
 commission_richard numeric(12,2) not null default 0, commission_anastasia numeric(12,2) not null default 0, commission_jean_claude numeric(12,2) not null default 0,
 status sale_status not null default 'PENDING', decided_at timestamptz, decided_by uuid references employees(id), source text not null check(source in ('web','telegram')), origin_chat_id bigint,
 sheets_state delivery_state not null default 'PENDING', sheets_error text, notification_state delivery_state not null default 'NOT_APPLICABLE', notification_error text,
 check (proposed_richard+proposed_anastasia+proposed_jean_claude=100), check ((status='PENDING' and approved_richard is null and approved_anastasia is null and approved_jean_claude is null) or (status='APPROVED' and approved_richard+approved_anastasia+approved_jean_claude=100))
);
create table expenses (
 id uuid primary key default gen_random_uuid(), reference text not null unique check (reference ~ '^E[0-9]+$'), submitted_at timestamptz not null default now(), reporter_id uuid not null references employees(id),
 description text not null, category expense_category not null, amount numeric(12,2) not null check(amount>0), proposed_allocation allocation_code not null, final_allocation allocation_code,
 status expense_status not null, decided_at timestamptz, decided_by uuid references employees(id), source text not null check(source in ('web','telegram')), origin_chat_id bigint,
 sheets_state delivery_state not null default 'PENDING', sheets_error text, notification_state delivery_state not null default 'NOT_APPLICABLE', notification_error text,
 check ((status='AWAITING_ALLOCATION' and final_allocation is null) or (status='ALLOCATED' and final_allocation is not null))
);
alter table sales enable row level security; alter table expenses enable row level security; alter table employees enable row level security;
-- Browser uses only read access; all writes run through the server service key and processing layer.
create policy "public demo read employees" on employees for select using (true);
create policy "public demo read sales" on sales for select using (true);
create policy "public demo read expenses" on expenses for select using (true);
