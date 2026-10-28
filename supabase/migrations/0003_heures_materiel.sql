-- Vague 2 : feuille d'heures, matériel, agenda du bureau, coffre-fort des documents.

create type type_pointage as enum ('chantier', 'depot', 'trajet', 'formation', 'autre');
create type statut_pointage as enum ('saisi', 'valide_chef', 'valide_bureau', 'refuse');
create type type_materiel as enum ('pompe', 'malaxeur', 'camion', 'laser', 'bombe_cm', 'autre');
create type type_rendez_vous as enum ('visite_technique', 'metre', 'rdv_client', 'autre');
create type type_document_entreprise as enum ('kbis', 'urssaf', 'decennale', 'rc_pro', 'liste_salaries', 'rib', 'autre');

alter table entreprises
  add column parametres_paie jsonb,
  add column depot_lat double precision,
  add column depot_lng double precision,
  add column cout_horaire_defaut numeric(7,2);

alter table membres
  add column matricule text,
  add column cout_horaire numeric(7,2);

alter table chantiers
  add column materiel_ids jsonb not null default '[]'::jsonb;

create table pointages (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  membre_id uuid not null references membres(id) on delete cascade,
  chantier_id uuid references chantiers(id) on delete set null,
  date date not null,
  debut timestamptz not null,
  fin timestamptz,
  pause_min int not null default 0,
  type type_pointage not null default 'chantier',
  zone_trajet smallint check (zone_trajet between 1 and 5),
  panier boolean not null default true,
  grand_deplacement boolean not null default false,
  statut statut_pointage not null default 'saisi',
  lat_debut double precision,
  lng_debut double precision,
  lat_fin double precision,
  lng_fin double precision,
  ecart_chantier_km numeric(6,1),
  commentaire text,
  valide_chef_id uuid references membres(id),
  valide_bureau_id uuid references membres(id),
  created_at timestamptz not null default now(),
  check (fin is null or fin >= debut)
);
create index pointages_membre_date_idx on pointages(membre_id, date);
create index pointages_entreprise_date_idx on pointages(entreprise_id, date);

create table materiels (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  type type_materiel not null,
  nom text not null,
  immatriculation text,
  numero_serie text,
  date_achat date,
  equipe_id uuid references equipes(id) on delete set null,
  actif boolean not null default true,
  controles jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);
create index materiels_entreprise_idx on materiels(entreprise_id);

create table rendez_vous (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  type type_rendez_vous not null,
  date date not null,
  heure time not null,
  duree_min int not null default 60,
  chantier_id uuid references chantiers(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  membre_id uuid references membres(id) on delete set null,
  adresse text,
  notes text,
  rappel_envoye_le timestamptz,
  created_at timestamptz not null default now()
);
create index rendez_vous_entreprise_date_idx on rendez_vous(entreprise_id, date);

create table documents_entreprise (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  type type_document_entreprise not null,
  nom text not null,
  date_fin date,
  url text,
  created_at timestamptz not null default now()
);

create trigger audit_pointages after insert or update or delete on pointages for each row execute function journaliser();
create trigger audit_materiels after insert or update or delete on materiels for each row execute function journaliser();

-- Un pointage validé par le bureau ne se modifie plus (sauf retour en « saisi » par le bureau).
create or replace function figer_pointage()
returns trigger language plpgsql as $$
begin
  if old.statut = 'valide_bureau' and new.statut = 'valide_bureau' and (new.debut <> old.debut or new.fin is distinct from old.fin or new.pause_min <> old.pause_min) then
    raise exception 'Un pointage validé par le bureau ne se modifie plus.';
  end if;
  return new;
end $$;
create trigger pointages_figes before update on pointages for each row execute function figer_pointage();

-- Identité du membre courant dans une entreprise (pour les droits sur ses propres pointages).
create or replace function mon_membre_id(p_entreprise uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from membres where user_id = auth.uid() and entreprise_id = p_entreprise limit 1;
$$;

alter table pointages enable row level security;
alter table materiels enable row level security;
alter table rendez_vous enable row level security;
alter table documents_entreprise enable row level security;

-- Chacun voit ses pointages ; le chef ceux de son équipe ; le bureau tout.
create policy pointages_lecture on pointages for select using (
  est_bureau(entreprise_id)
  or membre_id = mon_membre_id(entreprise_id)
  or (mon_role(entreprise_id) = 'chef_equipe' and membre_id in (
        select m.id from membres m where m.equipe_id = (select equipe_id from membres where id = mon_membre_id(pointages.entreprise_id))))
);
create policy pointages_saisie on pointages for insert with check (
  entreprise_id in (select mes_entreprises()) and (membre_id = mon_membre_id(entreprise_id) or mon_role(entreprise_id) in ('gerant', 'bureau', 'chef_equipe'))
);
create policy pointages_modification on pointages for update using (
  est_bureau(entreprise_id)
  or (statut = 'saisi' and membre_id = mon_membre_id(entreprise_id))
  or (mon_role(entreprise_id) = 'chef_equipe' and statut in ('saisi', 'valide_chef'))
);

create policy materiels_lecture on materiels for select using (entreprise_id in (select mes_entreprises()));
create policy materiels_ecriture on materiels for all using (mon_role(entreprise_id) in ('gerant', 'bureau', 'chef_equipe'));

create policy rdv_lecture on rendez_vous for select using (entreprise_id in (select mes_entreprises()));
create policy rdv_bureau on rendez_vous for all using (est_bureau(entreprise_id));

create policy documents_bureau on documents_entreprise for all using (est_bureau(entreprise_id));
