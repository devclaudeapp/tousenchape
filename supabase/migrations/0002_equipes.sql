-- Vague 1 : équipes, fiche compagnon, indisponibilités, fil de chantier.

create type type_contrat as enum ('cdi', 'cdd', 'interim', 'apprenti', 'gerant');
create type motif_indisponibilite as enum ('conge', 'maladie', 'formation', 'autre');

create table equipes (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  nom text not null,
  couleur text not null default '#13836d',
  chef_id uuid references membres(id) on delete set null,
  capacite_m2_jour int not null default 250,
  created_at timestamptz not null default now()
);
create index equipes_entreprise_idx on equipes(entreprise_id);

alter table membres
  add column telephone text,
  add column equipe_id uuid references equipes(id) on delete set null,
  add column type_contrat type_contrat,
  add column date_entree date,
  add column habilitations jsonb not null default '[]'::jsonb,
  add column actif boolean not null default true,
  add column notes text;
-- L'ancien libellé d'équipe libre est remplacé par la référence.
alter table membres drop column if exists equipe;

alter table chantiers
  add column equipe_id uuid references equipes(id) on delete set null,
  add column renforts jsonb not null default '[]'::jsonb,
  add column surface_prevue_m2 numeric(8,2);

create table indisponibilites (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  membre_id uuid not null references membres(id) on delete cascade,
  debut date not null,
  fin date not null,
  motif motif_indisponibilite not null default 'conge',
  commentaire text,
  created_at timestamptz not null default now(),
  check (fin >= debut)
);
create index indisponibilites_membre_idx on indisponibilites(membre_id, debut);

create table messages (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  chantier_id uuid not null references chantiers(id) on delete cascade,
  auteur_id uuid references membres(id) on delete set null,
  texte text not null,
  photo_url text,
  signalement boolean not null default false,
  traite_le timestamptz,
  created_at timestamptz not null default now()
);
create index messages_chantier_idx on messages(chantier_id, created_at);

create trigger audit_messages after insert or update or delete on messages for each row execute function journaliser();
create trigger audit_indisponibilites after insert or update or delete on indisponibilites for each row execute function journaliser();

-- RLS
alter table equipes enable row level security;
alter table indisponibilites enable row level security;
alter table messages enable row level security;

create policy equipes_lecture on equipes for select using (entreprise_id in (select mes_entreprises()));
create policy equipes_bureau on equipes for all using (est_bureau(entreprise_id));

-- Un compagnon voit ses propres indisponibilités et celles de son équipe ; le bureau et le chef les gèrent.
create policy indispos_lecture on indisponibilites for select using (entreprise_id in (select mes_entreprises()));
create policy indispos_ecriture on indisponibilites for all
  using (mon_role(entreprise_id) in ('gerant', 'bureau', 'chef_equipe'));

-- Tout membre lit et écrit dans le fil des chantiers de son entreprise.
create policy messages_lecture on messages for select using (entreprise_id in (select mes_entreprises()));
create policy messages_ecriture on messages for insert with check (entreprise_id in (select mes_entreprises()));
create policy messages_traitement on messages for update using (est_bureau(entreprise_id));

-- Photos du fil de chantier : un bucket privé, un dossier par entreprise.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
create policy photos_lecture on storage.objects for select
  using (bucket_id = 'photos' and (storage.foldername(name))[1]::uuid in (select mes_entreprises()));
create policy photos_ecriture on storage.objects for insert
  with check (bucket_id = 'photos' and (storage.foldername(name))[1]::uuid in (select mes_entreprises()));
