-- Tous en chape — schéma initial.
-- Multi-entreprise : chaque table métier porte entreprise_id et une politique RLS
-- qui n'autorise une ligne qu'aux membres de cette entreprise.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type role_membre as enum ('gerant', 'bureau', 'chef_equipe', 'applicateur');
create type type_client as enum ('particulier', 'professionnel', 'collectivite');
create type liant as enum ('sulfate_calcium', 'ciment');
create type canal_commande as enum ('email', 'portail');
create type statut_devis as enum ('brouillon', 'envoye', 'signe', 'refuse', 'expire');
create type statut_chantier as enum ('planifie', 'preparation', 'pret', 'coule', 'sechage', 'reception', 'facture', 'clos');
create type type_facture as enum ('acompte', 'situation', 'solde', 'avoir');
create type statut_facture as enum ('brouillon', 'emise', 'payee', 'en_retard', 'annulee');

-- ---------------------------------------------------------------------------
-- Entreprises et membres
-- ---------------------------------------------------------------------------
create table entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  siren text,
  tva_intracom text,
  adresse text,
  code_postal text,
  ville text,
  telephone text,
  email text,
  logo_url text,
  assureur_decennale text,
  numero_contrat_decennale text,
  zone_couverture_decennale text,
  attestation_decennale_url text,
  attestation_decennale_expire_le date,
  mediateur_consommation text,
  formule text not null default 'essai',
  taux_pertes numeric(5,3) not null default 0.05,
  grille_tarifaire jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table membres (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nom text not null,
  email text not null,
  role role_membre not null default 'applicateur',
  equipe text,
  cqp_numero text,
  cqp_date date,
  created_at timestamptz not null default now(),
  unique (entreprise_id, user_id)
);
create index membres_user_idx on membres(user_id);

-- Fonctions d'aide pour les politiques RLS.
create or replace function mes_entreprises()
returns setof uuid
language sql stable security definer set search_path = public as $$
  select entreprise_id from membres where user_id = auth.uid();
$$;

create or replace function mon_role(p_entreprise uuid)
returns role_membre
language sql stable security definer set search_path = public as $$
  select role from membres where user_id = auth.uid() and entreprise_id = p_entreprise limit 1;
$$;

create or replace function est_bureau(p_entreprise uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(mon_role(p_entreprise) in ('gerant', 'bureau'), false);
$$;

-- ---------------------------------------------------------------------------
-- Clients, centrales, produits
-- ---------------------------------------------------------------------------
create table clients (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  type type_client not null default 'particulier',
  nom text not null,
  siren text,
  email text,
  telephone text,
  adresse text,
  code_postal text,
  ville text,
  conditions_paiement_jours int not null default 30,
  notes text,
  created_at timestamptz not null default now()
);
create index clients_entreprise_idx on clients(entreprise_id);

create table centrales (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  nom text not null,
  ville text,
  capacite_toupie_m3 numeric(4,1) not null default 7,
  canal_commande canal_commande not null default 'email',
  email text,
  url_portail text,
  delai_commande_heures int not null default 48,
  created_at timestamptz not null default now()
);
create index centrales_entreprise_idx on centrales(entreprise_id);

-- Catalogue produits : les lignes sans entreprise_id sont le référentiel partagé (QB46 / DTA),
-- lisible par tous ; une entreprise peut ajouter les siens ou surcharger le prix.
create table produits (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid references entreprises(id) on delete cascade,
  centrale_id uuid references centrales(id) on delete set null,
  nom text not null,
  fabricant text not null,
  liant liant not null,
  classe text not null,
  etalement_min_cm numeric(4,1) not null,
  etalement_max_cm numeric(4,1) not null,
  eau_max_l_par_m3 numeric(5,1) not null,
  temps_utilisation_min int not null,
  masse_volumique_kg_m3 int not null default 2000,
  mise_en_chauffe_jours_min int not null default 7,
  certificat_qb46 text,
  prix_m3 numeric(8,2),
  source_url text,
  created_at timestamptz not null default now()
);

-- Référentiel partagé des épaisseurs minimales (RP Tableaux 4, 5 et 8), lecture seule.
create table regles_epaisseur (
  id serial primary key,
  liant liant not null,
  classe text,
  mode_pose text not null,
  support text,
  classe_isolant text,
  classe_local text not null,
  fibree boolean not null default false,
  epaisseur_min_cm numeric(3,1) not null,
  reference text not null
);

-- ---------------------------------------------------------------------------
-- Devis, chantiers, livraisons, contrôles
-- ---------------------------------------------------------------------------
create table devis (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  client_id uuid not null references clients(id),
  produit_id uuid references produits(id),
  numero text not null,
  version int not null default 1,
  statut statut_devis not null default 'brouillon',
  objet text,
  adresse_chantier text,
  code_postal_chantier text,
  ville_chantier text,
  configuration jsonb not null,
  pieces jsonb not null default '[]'::jsonb,
  options jsonb not null default '{}'::jsonb,
  lignes_libres jsonb not null default '[]'::jsonb,
  contexte_fiscal jsonb not null,
  -- Instantané du chiffrage au moment de l'envoi ou de la signature.
  resultat jsonb,
  date_validite date,
  envoye_le timestamptz,
  signe_le timestamptz,
  signature_nom text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entreprise_id, numero, version)
);
create index devis_entreprise_idx on devis(entreprise_id, created_at desc);

create table chantiers (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  devis_id uuid references devis(id),
  client_id uuid not null references clients(id),
  produit_id uuid references produits(id),
  centrale_id uuid references centrales(id),
  chef_equipe_id uuid references membres(id),
  numero text not null,
  statut statut_chantier not null default 'planifie',
  adresse text,
  code_postal text,
  ville text,
  latitude double precision,
  longitude double precision,
  acces_camion text,
  distance_pompage_m int,
  etage int,
  date_coulage date,
  heure_premier_camion time,
  heure_debut_coulage timestamptz,
  heure_fin_coulage timestamptz,
  surface_coulee_m2 numeric(8,2),
  nature_support text,
  classement_upec text,
  temperature_c numeric(4,1),
  motif_report text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entreprise_id, numero)
);
create index chantiers_entreprise_idx on chantiers(entreprise_id, date_coulage);

create table livraisons (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  chantier_id uuid not null references chantiers(id) on delete cascade,
  numero_bon text not null,
  unite_production text,
  heure_fabrication timestamptz,
  heure_arrivee timestamptz,
  heure_fin_dechargement timestamptz,
  volume_m3 numeric(5,2) not null,
  etalement_depart_cm numeric(4,1),
  etalement_chantier_cm numeric(4,1) not null,
  eau_ajoutee_l_par_m3 numeric(5,1) not null default 0,
  alertes jsonb not null default '[]'::jsonb,
  signe_par uuid references membres(id),
  created_at timestamptz not null default now()
);
create index livraisons_chantier_idx on livraisons(chantier_id);

create table controles (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  chantier_id uuid not null references chantiers(id) on delete cascade,
  type text not null, -- visite_technique | coulage | post_coulage | mesure_cm | reception
  reponses jsonb not null default '{}'::jsonb,
  mesures jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  conforme boolean,
  auteur_id uuid references membres(id),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);
create index controles_chantier_idx on controles(chantier_id);

-- ---------------------------------------------------------------------------
-- Facturation
-- ---------------------------------------------------------------------------
create table factures (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  client_id uuid not null references clients(id),
  devis_id uuid references devis(id),
  chantier_id uuid references chantiers(id),
  facture_origine_id uuid references factures(id),
  numero text not null,
  type type_facture not null,
  statut statut_facture not null default 'brouillon',
  date_emission date not null default current_date,
  date_echeance date,
  lignes jsonb not null default '[]'::jsonb,
  total_ht numeric(10,2) not null default 0,
  tva numeric(10,2) not null default 0,
  total_ttc numeric(10,2) not null default 0,
  retenue_garantie numeric(10,2) not null default 0,
  autoliquidation boolean not null default false,
  mentions jsonb not null default '[]'::jsonb,
  facturx_url text,
  created_at timestamptz not null default now(),
  unique (entreprise_id, numero)
);
create index factures_entreprise_idx on factures(entreprise_id, date_emission desc);

create table paiements (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references entreprises(id) on delete cascade,
  facture_id uuid not null references factures(id) on delete cascade,
  montant numeric(10,2) not null,
  date_paiement date not null default current_date,
  moyen text,
  reference text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Journal d'audit
-- ---------------------------------------------------------------------------
create table journal_audit (
  id bigserial primary key,
  entreprise_id uuid,
  user_id uuid,
  table_name text not null,
  row_id uuid,
  action text not null,
  avant jsonb,
  apres jsonb,
  created_at timestamptz not null default now()
);

create or replace function journaliser()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into journal_audit (entreprise_id, user_id, table_name, row_id, action, avant, apres)
  values (
    coalesce((to_jsonb(new) ->> 'entreprise_id')::uuid, (to_jsonb(old) ->> 'entreprise_id')::uuid),
    auth.uid(),
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger audit_devis after insert or update or delete on devis for each row execute function journaliser();
create trigger audit_chantiers after insert or update or delete on chantiers for each row execute function journaliser();
create trigger audit_livraisons after insert or update or delete on livraisons for each row execute function journaliser();
create trigger audit_controles after insert or update or delete on controles for each row execute function journaliser();
create trigger audit_factures after insert or update or delete on factures for each row execute function journaliser();

-- Une facture émise ou un devis signé ne se modifie plus.
create or replace function figer_facture()
returns trigger language plpgsql as $$
begin
  if old.statut <> 'brouillon' and (new.lignes <> old.lignes or new.total_ttc <> old.total_ttc or new.numero <> old.numero) then
    raise exception 'Une facture émise ne peut pas être modifiée : créez un avoir.';
  end if;
  return new;
end $$;
create trigger factures_figees before update on factures for each row execute function figer_facture();

create or replace function toucher_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger devis_updated before update on devis for each row execute function toucher_updated_at();
create trigger chantiers_updated before update on chantiers for each row execute function toucher_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table entreprises enable row level security;
alter table membres enable row level security;
alter table clients enable row level security;
alter table centrales enable row level security;
alter table produits enable row level security;
alter table regles_epaisseur enable row level security;
alter table devis enable row level security;
alter table chantiers enable row level security;
alter table livraisons enable row level security;
alter table controles enable row level security;
alter table factures enable row level security;
alter table paiements enable row level security;
alter table journal_audit enable row level security;

create policy entreprises_lecture on entreprises for select using (id in (select mes_entreprises()));
create policy entreprises_gerant on entreprises for update using (mon_role(id) = 'gerant');

create policy membres_lecture on membres for select using (entreprise_id in (select mes_entreprises()));
create policy membres_gerant on membres for all using (mon_role(entreprise_id) = 'gerant');

create policy clients_lecture on clients for select using (entreprise_id in (select mes_entreprises()));
create policy clients_bureau on clients for all using (est_bureau(entreprise_id));

create policy centrales_lecture on centrales for select using (entreprise_id in (select mes_entreprises()));
create policy centrales_bureau on centrales for all using (est_bureau(entreprise_id));

create policy produits_lecture on produits for select
  using (entreprise_id is null or entreprise_id in (select mes_entreprises()));
create policy produits_bureau on produits for all
  using (entreprise_id is not null and est_bureau(entreprise_id));

create policy regles_lecture on regles_epaisseur for select using (true);

create policy devis_lecture on devis for select using (entreprise_id in (select mes_entreprises()));
create policy devis_bureau on devis for all using (est_bureau(entreprise_id));

create policy chantiers_lecture on chantiers for select using (entreprise_id in (select mes_entreprises()));
create policy chantiers_ecriture on chantiers for all
  using (mon_role(entreprise_id) in ('gerant', 'bureau', 'chef_equipe'));

create policy livraisons_lecture on livraisons for select using (entreprise_id in (select mes_entreprises()));
create policy livraisons_ecriture on livraisons for all
  using (mon_role(entreprise_id) in ('gerant', 'bureau', 'chef_equipe'));

create policy controles_lecture on controles for select using (entreprise_id in (select mes_entreprises()));
create policy controles_ecriture on controles for all using (entreprise_id in (select mes_entreprises()));

create policy factures_lecture on factures for select using (est_bureau(entreprise_id));
create policy factures_bureau on factures for all using (est_bureau(entreprise_id));

create policy paiements_bureau on paiements for all using (est_bureau(entreprise_id));

create policy audit_gerant on journal_audit for select using (mon_role(entreprise_id) = 'gerant');

-- ---------------------------------------------------------------------------
-- Inscription : création de l'entreprise et du premier membre (gérant).
-- ---------------------------------------------------------------------------
create or replace function creer_entreprise(p_nom text, p_siren text, p_nom_gerant text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  insert into entreprises (nom, siren) values (p_nom, p_siren) returning id into v_id;
  insert into membres (entreprise_id, user_id, nom, email, role)
  values (v_id, auth.uid(), p_nom_gerant, coalesce((select email from auth.users where id = auth.uid()), ''), 'gerant');
  return v_id;
end $$;
