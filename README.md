# Tous en chape

Logiciel SaaS pour les entreprises d'application de chape fluide (sulfate de calcium et ciment) : devis calculés selon les Règles professionnelles, chantiers et planning des coulages, contrôles et traçabilité QB46, facturation conforme.

## Démarrer en deux minutes (mode démo)

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:3000> et cliquez sur **Ouvrir la démonstration**. Sans configuration Supabase, l'application tourne avec une entreprise fictive (Rhône Chapes Fluides) et des données en mémoire, persistées dans le dossier temporaire du système. Tout le parcours est utilisable : devis → envoi → signature → chantier → visite technique → coulage → bons de livraison → fiche de traçabilité → factures.

## Ce que fait la version actuelle (MVP)

| Module | Contenu |
| --- | --- |
| Devis | Pièces (surface, périmètre, épaisseur), produit certifié QB46, mode de pose, classement des locaux, plancher chauffant, revêtement. Calcul en direct : volume avec pertes, toupies, film, bande périphérique, charge au m², lignes par lot, totaux. **Blocage** d'une épaisseur sous le minimum des Règles professionnelles, alerte au-dessus du maximum et sur les joints de fractionnement. Régime de TVA déduit du client (taux réduit certifié, autoliquidation en sous-traitance, rétractation 14 jours). PDF avec mentions obligatoires. Versions successives. |
| Chantiers | Un devis signé devient un chantier. Planification (date, premier camion, centrale, produit, chef d'équipe **titulaire du CQP**, obligatoire), visite technique en checklist (un point bloquant non conforme interdit le passage « Prêt à couler »), coulage, saisie des toupies avec contrôle de l'étalement (plage du produit, perte > 20 %), de l'eau ajoutée et du temps d'utilisation, jalons automatiques après coulage, séchage estimé et seuil d'humidité CM. |
| Traçabilité QB46 | Fiche § 18 des Règles professionnelles générée sans ressaisie, avec les champs manquants signalés, en PDF signé par le chef d'équipe. |
| Facturation | Acompte, solde avec déduction des acomptes, retenue de garantie 5 %, autoliquidation, mentions légales, encaissements, encours et retards. |
| Planning | Quatre semaines de coulages par jour, conflits d'équipe signalés. |
| Paramètres | Entreprise et assurance décennale, grille tarifaire, équipe et CQP, produits et centrales. |

Le cœur métier est un module TypeScript pur, `src/lib/chape/`, couvert par 88 tests (`npm test`) :

- `epaisseurs.ts` : minimums et maximums (RP Tableaux 4, 5 et 8, plancher chauffant § 12) ;
- `volume.ts` : volume, toupies, film, bande, charge ;
- `joints.ts` : seuils de fractionnement par liant et retrait ;
- `sechage.ts` : jalons après coulage, séchage estimé, seuils CM (Tableau 13), nombre de prélèvements ;
- `tolerances.ts` : planéité, niveau, fissures ;
- `livraison.ts` : contrôle d'une toupie ;
- `tva.ts` : régime de TVA et mentions ;
- `devis.ts` : chiffrage par lots et totaux.

## Mettre en production avec Supabase

1. Créez un projet Supabase (région UE), puis appliquez `supabase/migrations/0001_init.sql` et `supabase/seed.sql` (via `supabase db push` ou l'éditeur SQL).
2. Activez la connexion par e-mail (lien magique) dans Authentication, avec `https://votre-domaine/auth/callback` dans les URL de redirection.
3. Copiez `.env.example` en `.env.local` et renseignez `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_APP_URL`.
4. Déployez sur Vercel (région Paris) avec les mêmes variables.

Au premier accès, un utilisateur sans entreprise crée son espace (`/bienvenue`) et en devient le gérant. L'isolation entre entreprises repose sur les politiques RLS de la migration (23 politiques), testées avec deux utilisateurs simulés sur un PostgreSQL local.

## Scripts

```bash
npm run dev        # serveur de développement
npm run check      # typecheck + lint + tests
npm run build      # build de production
```

## Références

- Règles professionnelles pour la mise en œuvre des chapes fluides à base de ciment ou de sulfate de calcium, UNECP-FFB / CAPEB, janvier 2023 (remplacent les CPT CSTB 3578 et 3774).
- Certification QB46 du CSTB ; guide SNPB « Évolutions chapes fluides » (2023) pour la fiche de traçabilité.
- Facturation : CGI art. 279-0 bis, 278-0 bis A, 283-2 nonies ; loi n° 2025-127 (mention de certification) ; Code de la consommation L221-18.

## Feuille de route

Le cahier des charges complet (marché, référentiel produits, cadre légal, modèle de données, V1 à V2) est tenu dans le document « Tous en chape — Cahier des charges ». Prochaines étapes : signature électronique par lien client, commande à la centrale (e-mail puis portail), contrôles mobiles hors ligne, Factur-X et plateforme agréée avant septembre 2027.
