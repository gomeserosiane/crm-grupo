create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  image text not null,
  title text not null,
  content text not null,
  link_url text not null,
  created_at timestamptz not null default now()
);

alter table public.blog_posts add column if not exists link_url text;
update public.blog_posts
set link_url = 'https://site-teste-mauve.vercel.app/'
where link_url is null;
alter table public.blog_posts alter column link_url set not null;

alter table public.blog_posts enable row level security;

drop policy if exists "Permitir leitura publica do blog" on public.blog_posts;
create policy "Permitir leitura publica do blog"
on public.blog_posts
for select
using (true);

drop policy if exists "Permitir escrita publica temporaria" on public.blog_posts;
drop policy if exists "Permitir escrita autenticada do blog" on public.blog_posts;
create policy "Permitir escrita autenticada do blog"
on public.blog_posts
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

insert into public.blog_posts (image, title, content, link_url)
values
('https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80', 'Atendimento integrado para empresas em Belém', 'O grupo reúne documentação, contabilidade, certificação digital e seguros para simplificar a rotina de empresas que precisam de agilidade.', 'https://site-teste-mauve.vercel.app/'),
('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80', 'Soluções imobiliárias com suporte completo', 'Compra, venda, aluguel e regularização de imóveis contam com acompanhamento consultivo para reduzir burocracias e dar mais segurança.', 'https://site-teste-mauve.vercel.app/'),
('https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&q=80', 'Saúde e proteção para famílias', 'Planos de saúde, odontológicos, seguros e proteção familiar ajudam clientes a cuidar do presente com planejamento e confiança.', 'https://site-teste-mauve.vercel.app/')
on conflict do nothing;

create table if not exists public.real_estate_properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null,
  address text not null,
  neighborhood text not null,
  city text not null,
  learn_more_url text not null,
  images jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.real_estate_properties enable row level security;

drop policy if exists "Permitir leitura publica dos imoveis" on public.real_estate_properties;
create policy "Permitir leitura publica dos imoveis"
on public.real_estate_properties
for select
using (true);

drop policy if exists "Permitir escrita publica temporaria dos imoveis" on public.real_estate_properties;
drop policy if exists "Permitir escrita autenticada dos imoveis" on public.real_estate_properties;
create policy "Permitir escrita autenticada dos imoveis"
on public.real_estate_properties
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

