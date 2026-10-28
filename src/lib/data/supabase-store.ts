import type { SupabaseClient } from "@supabase/supabase-js";
import { GRILLE_DEMO } from "@/lib/chape/devis";
import type {
  Centrale,
  Chantier,
  Client,
  Controle,
  Devis,
  DocumentEntreprise,
  Entreprise,
  Equipe,
  Facture,
  Indisponibilite,
  LivraisonBon,
  Materiel,
  Membre,
  Message,
  Pointage,
  Produit,
  RendezVous,
} from "@/lib/domain/types";
import { numeroSuivant, type DataStore } from "./store";

/**
 * Implémentation Supabase. Les requêtes passent par le client de l'utilisateur connecté :
 * les politiques RLS garantissent l'isolation, le filtre entreprise_id n'est là que pour l'index.
 */

type Ligne = Record<string, unknown>;

/** Sous-ensemble du constructeur de requête PostgREST utilisé ici. */
interface Requete extends PromiseLike<{ data: unknown; error: { message: string } | null }> {
  eq(colonne: string, valeur: string): Requete;
  gte(colonne: string, valeur: string): Requete;
  lte(colonne: string, valeur: string): Requete;
  order(colonne: string, options?: { ascending?: boolean }): Requete;
}

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function versLigne(obj: object): Ligne {
  const out: Ligne = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[snake(k)] = v;
  return out;
}

function versObjet<T>(ligne: Ligne): T {
  const out: Ligne = {};
  for (const [k, v] of Object.entries(ligne)) if (v !== null) out[camel(k)] = v;
  return out as T;
}

function erreur(e: { message: string } | null, contexte: string): never {
  throw new Error(`${contexte} : ${e?.message ?? "erreur inconnue"}`);
}

export class SupabaseStore implements DataStore {
  constructor(
    private readonly sb: SupabaseClient,
    readonly entrepriseId: string,
  ) {}

  private table(nom: string) {
    return this.sb.from(nom);
  }

  private async liste<T>(nom: string, filtre?: (q: Requete) => Requete): Promise<T[]> {
    let q = this.table(nom).select("*").eq("entreprise_id", this.entrepriseId) as unknown as Requete;
    if (filtre) q = filtre(q);
    const { data, error } = await q;
    if (error) erreur(error, `Lecture ${nom}`);
    return (data as Ligne[]).map((l) => versObjet<T>(l));
  }

  private async un<T>(nom: string, id: string): Promise<T | null> {
    const { data, error } = await this.table(nom).select("*").eq("id", id).maybeSingle();
    if (error) erreur(error, `Lecture ${nom}`);
    return data ? versObjet<T>(data as Ligne) : null;
  }

  private async inserer<T>(nom: string, valeurs: object): Promise<T> {
    const { data, error } = await this.table(nom).insert(versLigne(valeurs)).select("*").single();
    if (error) erreur(error, `Création ${nom}`);
    return versObjet<T>(data as Ligne);
  }

  private async modifier<T>(nom: string, id: string, patch: object): Promise<T> {
    const { data, error } = await this.table(nom).update(versLigne(patch)).eq("id", id).select("*").single();
    if (error) erreur(error, `Mise à jour ${nom}`);
    return versObjet<T>(data as Ligne);
  }

  async entreprise(): Promise<Entreprise> {
    const e = await this.un<Entreprise>("entreprises", this.entrepriseId);
    if (!e) throw new Error("Entreprise introuvable.");
    const grille = e.grilleTarifaire && Object.keys(e.grilleTarifaire).length > 0 ? e.grilleTarifaire : GRILLE_DEMO;
    return { ...e, tauxPertes: Number(e.tauxPertes ?? 0.05), grilleTarifaire: grille };
  }
  mettreAJourEntreprise(patch: Partial<Entreprise>) {
    return this.modifier<Entreprise>("entreprises", this.entrepriseId, patch);
  }
  async membres() {
    const m = await this.liste<Membre>("membres", (q) => q.order("nom"));
    return m.map((x) => ({ ...x, habilitations: x.habilitations ?? [], actif: x.actif ?? true }));
  }
  async membre(id: string) {
    const m = await this.un<Membre>("membres", id);
    return m ? { ...m, habilitations: m.habilitations ?? [], actif: m.actif ?? true } : null;
  }
  creerMembre(data: Omit<Membre, "id" | "entrepriseId">) {
    // Sans compte utilisateur encore : la ligne est rattachée à l'invitation par e-mail (user_id renseigné à la première connexion).
    return this.inserer<Membre>("membres", { ...data, entrepriseId: this.entrepriseId });
  }
  mettreAJourMembre(id: string, patch: Partial<Membre>) {
    return this.modifier<Membre>("membres", id, patch);
  }

  equipes() {
    return this.liste<Equipe>("equipes", (q) => q.order("nom"));
  }
  creerEquipe(data: Omit<Equipe, "id" | "entrepriseId">) {
    return this.inserer<Equipe>("equipes", { ...data, entrepriseId: this.entrepriseId });
  }
  mettreAJourEquipe(id: string, patch: Partial<Equipe>) {
    return this.modifier<Equipe>("equipes", id, patch);
  }

  indisponibilites() {
    return this.liste<Indisponibilite>("indisponibilites", (q) => q.order("debut"));
  }
  creerIndisponibilite(data: Omit<Indisponibilite, "id" | "entrepriseId" | "createdAt">) {
    return this.inserer<Indisponibilite>("indisponibilites", { ...data, entrepriseId: this.entrepriseId });
  }
  async supprimerIndisponibilite(id: string) {
    const { error } = await this.table("indisponibilites").delete().eq("id", id);
    if (error) erreur(error, "Suppression indisponibilité");
  }

  messages(chantierId?: string) {
    return this.liste<Message>("messages", (q) => (chantierId ? q.eq("chantier_id", chantierId) : q).order("created_at"));
  }
  creerMessage(data: Omit<Message, "id" | "entrepriseId" | "createdAt">) {
    return this.inserer<Message>("messages", { ...data, entrepriseId: this.entrepriseId });
  }
  mettreAJourMessage(id: string, patch: Partial<Message>) {
    return this.modifier<Message>("messages", id, patch);
  }
  pointages(filtre: { membreId?: string; chantierId?: string; depuis?: string; jusqua?: string } = {}) {
    return this.liste<Pointage>("pointages", (q) => {
      let r = q;
      if (filtre.membreId) r = r.eq("membre_id", filtre.membreId);
      if (filtre.chantierId) r = r.eq("chantier_id", filtre.chantierId);
      if (filtre.depuis) r = r.gte("date", filtre.depuis);
      if (filtre.jusqua) r = r.lte("date", filtre.jusqua);
      return r.order("debut");
    });
  }
  pointage(id: string) {
    return this.un<Pointage>("pointages", id);
  }
  creerPointage(data: Omit<Pointage, "id" | "entrepriseId" | "createdAt">) {
    return this.inserer<Pointage>("pointages", { ...data, entrepriseId: this.entrepriseId });
  }
  mettreAJourPointage(id: string, patch: Partial<Pointage>) {
    return this.modifier<Pointage>("pointages", id, patch);
  }

  async materiels() {
    const m = await this.liste<Materiel>("materiels", (q) => q.order("nom"));
    return m.map((x) => ({ ...x, controles: x.controles ?? [], actif: x.actif ?? true }));
  }
  creerMateriel(data: Omit<Materiel, "id" | "entrepriseId">) {
    return this.inserer<Materiel>("materiels", { ...data, entrepriseId: this.entrepriseId });
  }
  mettreAJourMateriel(id: string, patch: Partial<Materiel>) {
    return this.modifier<Materiel>("materiels", id, patch);
  }

  rendezVous() {
    return this.liste<RendezVous>("rendez_vous", (q) => q.order("date").order("heure"));
  }
  creerRendezVous(data: Omit<RendezVous, "id" | "entrepriseId" | "createdAt">) {
    return this.inserer<RendezVous>("rendez_vous", { ...data, entrepriseId: this.entrepriseId });
  }
  mettreAJourRendezVous(id: string, patch: Partial<RendezVous>) {
    return this.modifier<RendezVous>("rendez_vous", id, patch);
  }
  async supprimerRendezVous(id: string) {
    const { error } = await this.table("rendez_vous").delete().eq("id", id);
    if (error) erreur(error, "Suppression rendez-vous");
  }

  documents() {
    return this.liste<DocumentEntreprise>("documents_entreprise", (q) => q.order("type"));
  }
  creerDocument(data: Omit<DocumentEntreprise, "id" | "entrepriseId" | "createdAt">) {
    return this.inserer<DocumentEntreprise>("documents_entreprise", { ...data, entrepriseId: this.entrepriseId });
  }
  async supprimerDocument(id: string) {
    const { error } = await this.table("documents_entreprise").delete().eq("id", id);
    if (error) erreur(error, "Suppression document");
  }

  async enregistrerPhoto(dataUrl: string, chantierId: string) {
    const [entete, base64] = dataUrl.split(",");
    const type = /data:(.*?);/.exec(entete ?? "")?.[1] ?? "image/jpeg";
    const chemin = `${this.entrepriseId}/${chantierId}/${crypto.randomUUID()}.jpg`;
    const { error } = await this.sb.storage.from("photos").upload(chemin, Buffer.from(base64 ?? "", "base64"), { contentType: type });
    if (error) erreur(error, "Envoi de la photo");
    const { data } = await this.sb.storage.from("photos").createSignedUrl(chemin, 60 * 60 * 24 * 365 * 10);
    return data?.signedUrl ?? chemin;
  }

  clients() {
    return this.liste<Client>("clients", (q) => q.order("nom"));
  }
  client(id: string) {
    return this.un<Client>("clients", id);
  }
  creerClient(data: Omit<Client, "id" | "entrepriseId" | "createdAt">) {
    return this.inserer<Client>("clients", { ...data, entrepriseId: this.entrepriseId });
  }
  mettreAJourClient(id: string, patch: Partial<Client>) {
    return this.modifier<Client>("clients", id, patch);
  }

  centrales() {
    return this.liste<Centrale>("centrales");
  }
  creerCentrale(data: Omit<Centrale, "id" | "entrepriseId">) {
    return this.inserer<Centrale>("centrales", { ...data, entrepriseId: this.entrepriseId });
  }
  async produits(): Promise<Produit[]> {
    // Référentiel partagé (entreprise_id null) + produits propres à l'entreprise.
    const { data, error } = await this.table("produits").select("*").or(`entreprise_id.is.null,entreprise_id.eq.${this.entrepriseId}`).order("fabricant");
    if (error) erreur(error, "Lecture produits");
    return (data as Ligne[]).map((l) => ({ ...versObjet<Produit>(l), entrepriseId: (l.entreprise_id as string | null) ?? null }));
  }
  produit(id: string) {
    return this.un<Produit>("produits", id);
  }

  devisListe() {
    return this.liste<Devis>("devis", (q) => q.order("created_at", { ascending: false }));
  }
  devis(id: string) {
    return this.un<Devis>("devis", id);
  }
  async creerDevis(data: Omit<Devis, "id" | "entrepriseId" | "numero" | "version" | "createdAt" | "updatedAt">) {
    const existants = await this.devisListe();
    return this.inserer<Devis>("devis", {
      ...data,
      entrepriseId: this.entrepriseId,
      numero: numeroSuivant("DEV", existants.map((d) => d.numero)),
      version: 1,
    });
  }
  mettreAJourDevis(id: string, patch: Partial<Devis>) {
    return this.modifier<Devis>("devis", id, patch);
  }

  chantiers() {
    return this.liste<Chantier>("chantiers", (q) => q.order("date_coulage"));
  }
  chantier(id: string) {
    return this.un<Chantier>("chantiers", id);
  }
  async creerChantier(data: Omit<Chantier, "id" | "entrepriseId" | "numero" | "createdAt" | "updatedAt">) {
    const existants = await this.chantiers();
    return this.inserer<Chantier>("chantiers", {
      ...data,
      entrepriseId: this.entrepriseId,
      numero: numeroSuivant("CH", existants.map((c) => c.numero)),
    });
  }
  mettreAJourChantier(id: string, patch: Partial<Chantier>) {
    return this.modifier<Chantier>("chantiers", id, patch);
  }

  livraisons(chantierId: string) {
    return this.liste<LivraisonBon>("livraisons", (q) => q.eq("chantier_id", chantierId));
  }
  ajouterLivraison(data: Omit<LivraisonBon, "id" | "createdAt">) {
    return this.inserer<LivraisonBon>("livraisons", { ...data, entrepriseId: this.entrepriseId });
  }
  controles(chantierId: string) {
    return this.liste<Controle>("controles", (q) => q.eq("chantier_id", chantierId));
  }
  ajouterControle(data: Omit<Controle, "id" | "createdAt">) {
    return this.inserer<Controle>("controles", { ...data, entrepriseId: this.entrepriseId });
  }

  async factures(): Promise<Facture[]> {
    const factures = await this.liste<Facture>("factures", (q) => q.order("date_emission", { ascending: false }));
    const { data: paiements, error } = await this.table("paiements").select("*").eq("entreprise_id", this.entrepriseId);
    if (error) erreur(error, "Lecture paiements");
    return factures.map((f) => ({
      ...f,
      paiements: (paiements as Ligne[]).filter((p) => p.facture_id === f.id).map((p) => versObjet<Facture["paiements"][number]>(p)),
    }));
  }
  async facture(id: string) {
    const f = await this.un<Facture>("factures", id);
    if (!f) return null;
    const { data } = await this.table("paiements").select("*").eq("facture_id", id);
    return { ...f, paiements: ((data ?? []) as Ligne[]).map((p) => versObjet<Facture["paiements"][number]>(p)) };
  }
  async creerFacture(data: Omit<Facture, "id" | "entrepriseId" | "numero" | "createdAt">) {
    const existants = await this.liste<Facture>("factures");
    const { paiements: _p, ...reste } = data;
    void _p;
    const f = await this.inserer<Facture>("factures", {
      ...reste,
      entrepriseId: this.entrepriseId,
      numero: numeroSuivant("FA", existants.map((x) => x.numero)),
    });
    return { ...f, paiements: [] };
  }
  async mettreAJourFacture(id: string, patch: Partial<Facture>) {
    const { paiements, ...reste } = patch;
    if (paiements) {
      for (const p of paiements.filter((x) => !x.id || x.id.startsWith("nouveau"))) {
        await this.inserer("paiements", { entrepriseId: this.entrepriseId, factureId: id, montant: p.montant, datePaiement: p.datePaiement, moyen: p.moyen });
      }
    }
    const f = Object.keys(reste).length > 0 ? await this.modifier<Facture>("factures", id, reste) : await this.facture(id);
    if (!f) throw new Error("Facture introuvable.");
    return (await this.facture(id)) ?? f;
  }
}
