# Tous en chape

Logiciel SaaS pour les entreprises d'application de chape fluide (sulfate de calcium et ciment) : devis calculés selon les Règles professionnelles, chantiers et planning des coulages, contrôles et traçabilité QB46, facturation conforme.

## Démarrer en deux minutes (mode démo)

```bash
npm install
npm run dev
```

Ouvrez <http://localhost:3000> et cliquez sur **Ouvrir la démonstration**. Sans configuration Supabase, l'application tourne avec une entreprise fictive (Rhône Chapes Fluides) et des données en mémoire, persistées dans le dossier temporaire du système. Tout le parcours est utilisable : devis → envoi → signature → chantier → visite technique → coulage → bons de livraison → fiche de traçabilité → factures.

En bas du menu, **Changer de rôle** permet de voir l'application comme le gérant, le bureau, un chef d'équipe ou un applicateur : chacun a son premier écran et ses droits.

## Ce que fait la version actuelle (MVP)

| Module | Contenu |
| --- | --- |
| Devis | Pièces (surface, périmètre, épaisseur), produit certifié QB46, mode de pose, classement des locaux, plancher chauffant, revêtement. Calcul en direct : volume avec pertes, toupies, film, bande périphérique, charge au m², lignes par lot, totaux. **Blocage** d'une épaisseur sous le minimum des Règles professionnelles, alerte au-dessus du maximum et sur les joints de fractionnement. Régime de TVA déduit du client (taux réduit certifié, autoliquidation en sous-traitance, rétractation 14 jours). PDF avec mentions obligatoires. Versions successives. |
| Chantiers | Un devis signé devient un chantier. Planification (date, premier camion, centrale, produit, chef d'équipe **titulaire du CQP**, obligatoire), visite technique en checklist (un point bloquant non conforme interdit le passage « Prêt à couler »), coulage, saisie des toupies avec contrôle de l'étalement (plage du produit, perte > 20 %), de l'eau ajoutée et du temps d'utilisation, jalons automatiques après coulage, séchage estimé et seuil d'humidité CM. |
| Traçabilité QB46 | Fiche § 18 des Règles professionnelles générée sans ressaisie, avec les champs manquants signalés, en PDF signé par le chef d'équipe. |
| Facturation | Acompte, solde avec déduction des acomptes, retenue de garantie 5 %, autoliquidation, mentions légales, encaissements, encours et retards. |
| Planning | Semaine par équipe, chantiers déplacés par **glisser-déposer** (jour, équipe), charge en m² par jour contre la capacité de l'équipe, absences affichées, refus si le chef de l'équipe cible n'a pas le CQP, avertissement si le chef est absent. |
| Équipe | Fiche compagnon (contrat, équipe, CQP chapiste, téléphone), **habilitations** avec date de fin calculée (carte BTP, CACES, AIPR, SST, visite médicale, permis…) et alertes à 60 jours, **absences** (congé, maladie, formation), équipes avec chef, couleur et capacité, renforts du jour sur un chantier. |
| Ma journée | Premier écran du chef d'équipe et de l'applicateur, sur téléphone : chantiers du jour et du lendemain, itinéraire, heure du premier camion, accès, appel du client, visite technique ou saisie de toupie en un appui, coéquipiers présents ou absents. |
| Fil de chantier | Messages et photos (compressées sur le téléphone) par chantier, datés et attribués ; un **signalement** remonte dans les alertes du patron jusqu'à son traitement. |
| Alertes patron | Sur le tableau de bord : habilitations et décennale qui expirent, chantier sans chef CQP ou avec un chef absent, visite technique manquante à J-2, factures en retard, signalements du terrain. |
| Heures | **Pointage** depuis Ma journée (arrivée, départ, pause, panier, grand déplacement, position GPS et écart au chantier), feuille d'heures hebdomadaire par équipe, validation par le chef puis le bureau, corrections, saisie manuelle, validation groupée de la semaine. |
| Paie | **Variables de paie** mensuelles par salarié : heures normales, supplémentaires à 25 % et 50 % (semaine de 35 h, seuil 43 h), paniers, indemnités de petit déplacement par zone, grands déplacements ; export CSV pour l'expert-comptable ; seuls les pointages validés par le bureau comptent. L'outil ne fait pas la paie. |
| Matériel | Pompes, malaxeurs, véhicules, lasers, bombe CM : équipe, affectation par chantier, **contrôles périodiques** (VGP, entretien, contrôle technique, étalonnage) avec prochaine échéance calculée et alertes à 30 jours. |
| Rentabilité | Réservée au gérant : par chantier, facturé contre mortier réellement livré, heures pointées × coût horaire chargé et pompe ; marge en € et %, pertes réelles de mortier contre le taux du devis, m² par heure ; par équipe, m² par jour de coulage, heures par m², marge cumulée. |
| Agenda | Visites techniques, métrés et rendez-vous sur quatorze jours avec les coulages ; **rappel J-1** au client prêt à envoyer (accès toupie, eau, électricité, courants d'air, chauffage coupé) ; confirmation de rendez-vous par e-mail. |
| Documents | Coffre-fort des pièces de vigilance (Kbis, URSSAF, décennale, RC pro, liste des salariés étrangers) avec échéances et alertes ; pack d'envoi aux donneurs d'ordre tous les six mois. |
| Droits | Gérant et bureau : tout (rentabilité : gérant seul) ; chef d'équipe : devis en lecture, chantiers, planning, son équipe, heures de son équipe, matériel, agenda ; applicateur : ses chantiers, sa fiche, son pointage. Les prix d'achat, coûts horaires et marges ne sortent pas du bureau. |
| Paramètres | Entreprise et assurance décennale, grille tarifaire, produits et centrales. |

Le cœur métier est un module TypeScript pur, `src/lib/chape/`, couvert avec `src/lib/domain/` par 115 tests (`npm test`) :

- `epaisseurs.ts` : minimums et maximums (RP Tableaux 4, 5 et 8, plancher chauffant § 12) ;
- `volume.ts` : volume, toupies, film, bande, charge ;
- `joints.ts` : seuils de fractionnement par liant et retrait ;
- `sechage.ts` : jalons après coulage, séchage estimé, seuils CM (Tableau 13), nombre de prélèvements ;
- `tolerances.ts` : planéité, niveau, fissures ;
- `livraison.ts` : contrôle d'une toupie ;
- `tva.ts` : régime de TVA et mentions ;
- `devis.ts` : chiffrage par lots et totaux ;
- `domain/habilitations.ts` et `domain/alertes.ts` : validité des documents, alertes du patron, charge des équipes ;
- `domain/heures.ts` : durée des pointages, semaines à 35 h, majorations, paniers, zones de trajet, variables de paie et CSV ;
- `domain/rentabilite.ts` : coûts réels, marge, pertes réelles, m²/h, agrégats par équipe.

## Mettre en production avec Supabase

1. Créez un projet Supabase (région UE), puis appliquez dans l'ordre `supabase/migrations/0001_init.sql`, `0002_equipes.sql`, `0003_heures_materiel.sql` et `supabase/seed.sql` (via `supabase db push` ou l'éditeur SQL). La migration 0002 crée aussi le bucket privé `photos` pour le fil de chantier.
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

Le cahier des charges complet (marché, référentiel produits, cadre légal, gestion des équipes par vague, modèle de données, V1 à V2) est tenu dans le document « Tous en chape — Cahier des charges ». L'application s'installe sur l'écran d'accueil d'un téléphone (manifeste PWA). Prochaines étapes : notifications push (après déploiement HTTPS), signature électronique par lien client, envoi d'e-mails avec pièces jointes (rappels, pack de vigilance), commande à la centrale (e-mail puis portail), contrôles mobiles hors ligne, Factur-X et plateforme agréée avant septembre 2027.
