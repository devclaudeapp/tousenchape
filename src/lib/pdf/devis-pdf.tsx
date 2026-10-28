import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResultatDevis } from "@/lib/chape/devis";
import type { Client, Devis, Entreprise, Produit } from "@/lib/domain/types";
import { fmtDate, fmtEuros, fmtNombre, libelleLiant, libelleModePose } from "@/lib/format";

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#1c1917", lineHeight: 1.35 },
  entete: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  marque: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#116959", marginBottom: 6 },
  bloc: { marginBottom: 14 },
  titre: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  sousTitre: { fontSize: 8, color: "#57534e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  gris: { color: "#57534e" },
  ligne: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#e7e5e4", paddingVertical: 4 },
  enteteTable: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1c1917", paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  c1: { flex: 5 },
  c2: { flex: 1.3, textAlign: "right" },
  c3: { flex: 1.3, textAlign: "right" },
  c4: { flex: 1.5, textAlign: "right" },
  totaux: { marginTop: 8, alignItems: "flex-end" },
  totalLigne: { flexDirection: "row", width: 220, justifyContent: "space-between", paddingVertical: 2 },
  totalFort: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  mention: { fontSize: 8, color: "#44403c", marginBottom: 3 },
  signature: { marginTop: 18, flexDirection: "row", gap: 24 },
  cadre: { flex: 1, borderWidth: 0.5, borderColor: "#a8a29e", height: 70, padding: 6 },
  pied: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7.5, color: "#78716c", textAlign: "center" },
});

export function DevisPDF({ devis, resultat, entreprise, client, produit }: { devis: Devis; resultat: ResultatDevis; entreprise: Entreprise; client: Client; produit: Produit | null }) {
  const pc = devis.configuration.plancherChauffant;
  return (
    <Document title={`Devis ${devis.numero}`} author={entreprise.nom}>
      <Page size="A4" style={s.page}>
        <View style={s.entete}>
          <View>
            <Text style={s.marque}>{entreprise.nom}</Text>
            <Text>{entreprise.adresse}</Text>
            <Text>
              {entreprise.codePostal} {entreprise.ville}
            </Text>
            <Text style={s.gris}>
              {entreprise.telephone} · {entreprise.email}
            </Text>
            <Text style={s.gris}>
              SIREN {entreprise.siren}
              {entreprise.tvaIntracom ? ` · TVA ${entreprise.tvaIntracom}` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.titre}>
              Devis {devis.numero}
              {devis.version > 1 ? ` v${devis.version}` : ""}
            </Text>
            <Text>Date : {fmtDate(devis.createdAt)}</Text>
            <Text>Valable jusqu&apos;au {fmtDate(devis.dateValidite)}</Text>
            <Text style={s.gris}>Devis gratuit</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 24, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.sousTitre}>Client</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{client.nom}</Text>
            {client.adresse && <Text>{client.adresse}</Text>}
            <Text>
              {client.codePostal} {client.ville}
            </Text>
            {client.siren && <Text style={s.gris}>SIREN {client.siren}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sousTitre}>Lieu d&apos;exécution</Text>
            <Text>{devis.adresseChantier}</Text>
            <Text>
              {devis.codePostalChantier} {devis.villeChantier}
            </Text>
          </View>
        </View>

        <View style={s.bloc}>
          <Text style={s.sousTitre}>Objet</Text>
          <Text>{devis.objet}</Text>
          <Text style={s.gris}>
            {libelleLiant[devis.configuration.liant]}
            {produit ? ` — ${produit.fabricant} ${produit.nom} ${produit.classe}${produit.certificatQB46 ? `, ${produit.certificatQB46}` : ""}` : ""} · pose {libelleModePose[devis.configuration.modePose].toLowerCase()}
            {devis.configuration.classeIsolant ? ` ${devis.configuration.classeIsolant}` : ""} · locaux {devis.configuration.classeLocal}
            {pc.type !== "aucun" ? ` · plancher chauffant ${pc.type === "electrique" ? "électrique" : `à eau, tube ${pc.diametreTubeMm} mm`}` : ""}
          </Text>
        </View>

        <View style={s.bloc}>
          <Text style={s.sousTitre}>Pièces</Text>
          {devis.pieces.map((p) => (
            <Text key={p.id}>
              {p.nom} : {fmtNombre(p.surfaceM2)} m², épaisseur {fmtNombre(p.epaisseurCm)} cm
            </Text>
          ))}
          <Text style={s.gris}>
            Total {fmtNombre(resultat.quantites.surfaceM2)} m², {fmtNombre(resultat.quantites.volumeCommandeM3)} m³ de mortier pertes comprises.
          </Text>
        </View>

        <View style={s.enteteTable}>
          <Text style={s.c1}>Désignation</Text>
          <Text style={s.c2}>Quantité</Text>
          <Text style={s.c3}>PU HT</Text>
          <Text style={s.c4}>Montant HT</Text>
        </View>
        {resultat.lignes.map((l, i) => (
          <View key={i} style={s.ligne} wrap={false}>
            <Text style={s.c1}>{l.designation}</Text>
            <Text style={s.c2}>
              {fmtNombre(l.quantite)} {l.unite}
            </Text>
            <Text style={s.c3}>{fmtEuros(l.prixUnitaireHT)}</Text>
            <Text style={s.c4}>{fmtEuros(l.montantHT)}</Text>
          </View>
        ))}

        <View style={s.totaux}>
          <View style={s.totalLigne}>
            <Text>Total HT</Text>
            <Text>{fmtEuros(resultat.totaux.totalHT)}</Text>
          </View>
          <View style={s.totalLigne}>
            <Text>{resultat.regime.autoliquidation ? "TVA : autoliquidation" : `TVA ${resultat.regime.taux} %`}</Text>
            <Text>{fmtEuros(resultat.totaux.tva)}</Text>
          </View>
          <View style={[s.totalLigne, s.totalFort]}>
            <Text>Total TTC</Text>
            <Text>{fmtEuros(resultat.totaux.totalTTC)}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={s.sousTitre}>Conditions et mentions</Text>
          <Text style={s.mention}>Acompte de 30 % à la commande, solde à la réception des travaux. Les délais de séchage avant pose du revêtement dépendent de l&apos;épaisseur et des conditions du local ; seule une mesure d&apos;humidité résiduelle autorise la pose.</Text>
          <Text style={s.mention}>
            Assurance responsabilité civile décennale : {entreprise.assureurDecennale ?? "à renseigner"}, contrat n° {entreprise.numeroContratDecennale ?? "—"}, couverture {entreprise.zoneCouvertureDecennale ?? "—"}. Attestation jointe.
          </Text>
          {resultat.regime.mentions.map((m) => (
            <Text key={m} style={s.mention}>
              {m}
            </Text>
          ))}
          {entreprise.mediateurConsommation && devis.contexteFiscal.typeClient === "particulier" && <Text style={s.mention}>Médiateur de la consommation : {entreprise.mediateurConsommation}.</Text>}
        </View>

        <View style={s.signature}>
          <View style={s.cadre}>
            <Text style={s.sousTitre}>L&apos;entreprise</Text>
            <Text style={s.gris}>{entreprise.nom}</Text>
          </View>
          <View style={s.cadre}>
            <Text style={s.sousTitre}>Le client — « Bon pour accord »</Text>
            <Text style={s.gris}>Date et signature</Text>
          </View>
        </View>

        <Text style={s.pied} fixed>
          {entreprise.nom} · SIREN {entreprise.siren} · {entreprise.adresse}, {entreprise.codePostal} {entreprise.ville} · Chiffrage établi selon les Règles professionnelles chapes fluides (UNECP-FFB / CAPEB, 2023)
        </Text>
      </Page>
    </Document>
  );
}
