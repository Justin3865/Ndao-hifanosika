import test from "node:test";
import assert from "node:assert/strict";
import { inferToastKind } from "../toast";

test("inferToastKind : la couleur suit l'action", () => {
  // supprimer → delete (rouge)
  assert.equal(inferToastKind("Utilisateur supprimé."), "delete");
  assert.equal(inferToastKind("Suppression effectuée."), "delete");
  assert.equal(inferToastKind("Entraînement supprimé."), "delete");
  // modifier / enregistrer → update (bleu)
  assert.equal(inferToastKind("Modification enregistrée."), "update");
  assert.equal(inferToastKind("Utilisateur modifié."), "update");
  assert.equal(inferToastKind("Informations enregistrées."), "update");
  // créer → create (vert)
  assert.equal(inferToastKind("Élément créé avec succès."), "create");
  assert.equal(inferToastKind("Lien de suivi généré."), "create");
  // envoyer → send (violet)
  assert.equal(inferToastKind("Réponse envoyée."), "send");
  // annuler / refuser / désactiver → archive (orange)
  assert.equal(inferToastKind("Envoi programmé annulé."), "archive");
  assert.equal(inferToastKind("Inscription refusée."), "archive");
  assert.equal(inferToastKind("Désactivation effectuée."), "archive");
  assert.equal(inferToastKind("Notification archivée."), "archive");
  // désarchiver = restauration → update
  assert.equal(inferToastKind("Notification désarchivée."), "update");
  // défaut
  assert.equal(inferToastKind("Arrivée pointée : position vérifiée."), "success");
});
