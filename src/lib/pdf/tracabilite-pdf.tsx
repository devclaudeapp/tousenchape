import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { FicheTracabilite } from "@/lib/domain/tracabilite";
import type { Chantier, Entreprise, Membre } from "@/lib/domain/types";
import { fmtDateHeure, fmtHeure, fmtNombre } from "@/lib/format";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.35 },
  titre: { fontSize: 15, fontFamily: "Helvetica-Bold", color: "#116959", marginBottom: 2 },
  sousTitre: { color: "#57534e", marginBottom: 16 },
  section: { fontSize: 8, color: "#57534e", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  ligne: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4", paddingVertical: 3.5 },
  cle: { width: 200, color: "#57534e" },
  val: { flex: 1 },
  manquant: { color: "#be123c", fontFamily: "Helvetica-Oblique" },
  enteteTable: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1c1917", paddingVertical: 3, fontFamily: "Helvetica-Bold" },
  c: { flex: 1 },
  cL: { flex: 1.6 },
  alerte: { fontSize: 8, color: "#b45309" },
  signatures: { marginTop: 20, flexDirection: "row", gap: 24 },
  cadre: { flex: 1, borderWidth: 0.5, borderColor: "#a8a29e", height: 76, padding: 6 },
  pied: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7.5, color: "#78716c", textAlign: "center" },
});

export function TracabilitePDF({ fiche, chantier, entreprise, chef }: { fiche: FicheTracabilite; chantier: Chantier; entreprise: Entreprise; chef: Membre | null }) {
  return (
    <Document title={`Fiche de traçabilité ${chantier.numero}`} author={entreprise.nom}>
      <Page size="A4" style={s.page}>
        <Text style={s.titre}>Fiche de traçabilité — chape fluide</Text>
        <Text style={s.sousTitre}>
          Chantier {chantier.numero} · Règles professionnelles chapes fluides § 18 · certification QB46
        </Text>

        <Text style={s.section}>Identification</Text>
        {fiche.champs.map((c) => (
          <View key={c.cle} style={s.ligne} wrap={false}>
            <Text style={s.cle}>{c.libelle}</Text>
            <Text style={[s.val, c.manquant ? s.manquant : {}]}>{c.manquant ? "non renseigné" : c.valeur}</Text>
          </View>
        ))}

        <Text style={s.section}>Livraisons</Text>
        <View style={s.enteteTable}>
          <Text style={s.cL}>Bon</Text>
          <Text style={s.c}>Fabrication</Text>
          <Text style={s.c}>Arrivée</Text>
          <Text style={s.c}>Volume</Text>
          <Text style={s.c}>Étal. départ</Text>
          <Text style={s.c}>Étal. chantier</Text>
          <Text style={s.c}>Eau ajoutée</Text>
        </View>
        {fiche.livraisons.map((l) => (
          <View key={l.id} wrap={false}>
            <View style={s.ligne}>
              <Text style={s.cL}>{l.numeroBon}</Text>
              <Text style={s.c}>{fmtHeure(l.heureFabrication)}</Text>
              <Text style={s.c}>{fmtHeure(l.heureArrivee)}</Text>
              <Text style={s.c}>{fmtNombre(l.volumeM3)} m³</Text>
              <Text style={s.c}>{l.etalementDepartCm ? `${fmtNombre(l.etalementDepartCm)} cm` : "—"}</Text>
              <Text style={s.c}>{fmtNombre(l.etalementChantierCm)} cm</Text>
              <Text style={s.c}>{fmtNombre(l.eauAjouteeLParM3)} l/m³</Text>
            </View>
            {l.alertes.map((a, i) => (
              <Text key={i} style={s.alerte}>
                ⚠ {a.message}
              </Text>
            ))}
          </View>
        ))}
        {fiche.livraisons.length === 0 && <Text style={s.manquant}>Aucune livraison enregistrée.</Text>}

        <View style={s.signatures}>
          <View style={s.cadre}>
            <Text style={s.section}>Chef d&apos;équipe titulaire du CQP</Text>
            <Text>{chef?.nom ?? "—"}</Text>
            <Text style={{ color: "#57534e" }}>{chef?.cqpNumero ? `CQP ${chef.cqpNumero}` : "CQP non renseigné"}</Text>
          </View>
          <View style={s.cadre}>
            <Text style={s.section}>Entreprise</Text>
            <Text>{entreprise.nom}</Text>
            <Text style={{ color: "#57534e" }}>Date et signature</Text>
          </View>
        </View>

        <Text style={s.pied} fixed>
          Document établi le {fmtDateHeure(new Date().toISOString())} par Tous en chape pour {entreprise.nom}. Conservation 10 ans à compter de la réception des travaux.
        </Text>
      </Page>
    </Document>
  );
}
