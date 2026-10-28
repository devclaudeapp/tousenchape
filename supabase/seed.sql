-- Référentiel partagé : épaisseurs minimales (RP 2023) et produits certifiés QB46 / sous DTA.

insert into regles_epaisseur (liant, classe, mode_pose, support, classe_isolant, classe_local, fibree, epaisseur_min_cm, reference) values
-- Tableau 8 : sulfate de calcium
('sulfate_calcium', null, 'desolidarisee', 'courant',    null,  'P2', false, 2.5, 'RP § 11.3.6, Tableau 8'),
('sulfate_calcium', null, 'desolidarisee', 'courant',    null,  'P3', false, 3,   'RP § 11.3.6, Tableau 8'),
('sulfate_calcium', null, 'desolidarisee', 'ravoirage',  null,  'P2', false, 4,   'RP § 11.3.6, Tableau 8'),
('sulfate_calcium', null, 'desolidarisee', 'ravoirage',  null,  'P3', false, 4,   'RP § 11.3.6, Tableau 8'),
('sulfate_calcium', null, 'flottante',     null,         'SC1', 'P2', false, 3.5, 'RP § 11.3.6, Tableau 8'),
('sulfate_calcium', null, 'flottante',     null,         'SC1', 'P3', false, 4,   'RP § 11.3.6, Tableau 8'),
('sulfate_calcium', null, 'flottante',     null,         'SC2', 'P2', false, 4,   'RP § 11.3.6, Tableau 8'),
('sulfate_calcium', null, 'flottante',     null,         'SC2', 'P3', false, 4.5, 'RP § 11.3.6, Tableau 8'),
-- Tableau 4 : ciment C20-F4
('ciment', 'C20-F4', 'adherente',     null, null,  'P2', false, 3,   'RP § 10.3.8, Tableau 4'),
('ciment', 'C20-F4', 'adherente',     null, null,  'P4', false, 5,   'RP § 10.3.8, Tableau 4'),
('ciment', 'C20-F4', 'adherente',     null, null,  'P4', true,  4,   'RP § 10.3.8, Tableau 4'),
('ciment', 'C20-F4', 'desolidarisee', null, null,  'P2', false, 3,   'RP § 10.3.8, Tableau 4'),
('ciment', 'C20-F4', 'desolidarisee', null, null,  'P4', false, 5,   'RP § 10.3.8, Tableau 4'),
('ciment', 'C20-F4', 'flottante',     null, 'SC1', 'P2', false, 4,   'RP § 10.3.8, Tableau 4'),
('ciment', 'C20-F4', 'flottante',     null, 'SC2', 'P2', false, 5,   'RP § 10.3.8, Tableau 4'),
('ciment', 'C20-F4', 'flottante',     null, 'SC2', 'P2', true,  4.5, 'RP § 10.3.8, Tableau 4'),
-- Tableau 5 : ciment C16-F3/F4
('ciment', 'C16-F3', 'adherente',     null, null,  'P2', false, 3,   'RP § 10.3.8, Tableau 5'),
('ciment', 'C16-F3', 'desolidarisee', null, null,  'P2', false, 4,   'RP § 10.3.8, Tableau 5'),
('ciment', 'C16-F3', 'flottante',     null, 'SC1', 'P2', false, 4.5, 'RP § 10.3.8, Tableau 5'),
('ciment', 'C16-F3', 'flottante',     null, 'SC1', 'P2', true,  4,   'RP § 10.3.8, Tableau 5'),
('ciment', 'C16-F3', 'flottante',     null, 'SC2', 'P2', false, 5,   'RP § 10.3.8, Tableau 5'),
('ciment', 'C16-F3', 'flottante',     null, 'SC2', 'P2', true,  4.5, 'RP § 10.3.8, Tableau 5');

insert into produits (entreprise_id, nom, fabricant, liant, classe, etalement_min_cm, etalement_max_cm, eau_max_l_par_m3, temps_utilisation_min, masse_volumique_kg_m3, mise_en_chauffe_jours_min, source_url) values
(null, 'La Chape Liquide Classic', 'Anhydritec', 'sulfate_calcium', 'C20-F4', 24, 28, 50, 180, 2000, 7, 'https://www.anhydritec.fr/uploads/Document/dta-13-14-1244_v1-la-chape-liquide-classic.pdf'),
(null, 'Thermio Max',              'Anhydritec', 'sulfate_calcium', 'C30-F8', 24, 27, 35, 180, 2050, 5, 'https://www.anhydritec.fr/uploads/Document/dta-13_20-1467_v4---la_chape_liquide_thermio_max.pdf'),
(null, 'Syntichape',               'Sika',       'sulfate_calcium', 'C20-F4', 24, 28, 20, 180, 2000, 7, 'https://fra.sika.com/dam/dms/fr01/l/fr-doc-avis-tech-syntichape.pdf'),
(null, 'Viscochape',               'Sika',       'ciment',          'C20-F4', 22, 28, 10, 150, 2100, 7, 'https://fra.sika.com/dam/dms/fr01/0/fr-doc-avis-tech-viscochape.pdf'),
(null, 'Levelchape HCS',           'Sika',       'ciment',          'C16-F3', 22, 26, 10, 150, 2100, 7, 'https://fra.sika.com/dam/dms/fr01/1/fr-doc-avis-tech-levelchape-hcs.pdf'),
(null, 'La Chape Vicat HPC',       'Vicat',      'ciment',          'C16-F4', 22, 28, 10, 120, 2100, 7, 'https://www.chape-vicat.fr/produit/la-chape-vicat-hpc');
