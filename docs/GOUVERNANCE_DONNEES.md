# Gouvernance des données — registre, AIPD, incidents, droits

> **Avertissement.** Document de travail technique, **non validé juridiquement**. Il s'appuie sur la loi malgache n° 2014-038 sur la protection des données à caractère personnel et sur la CMIL (autorité de contrôle), dont l'application effective est incertaine. Les mentions « à confirmer par un juriste » doivent l'être avant tout usage officiel. Le texte de loi doit être relu à la source par un juriste malgache ; ce document ne le remplace pas.

## 1. Registre des traitements

| # | Traitement | Finalité | Personnes | Données | Base / accès | Conservation | Sous-traitants / transferts |
|---|---|---|---|---|---|---|---|
| T1 | Comptes utilisateurs | Authentification, rôles | Staff, tuteurs, stagiaires | Identité, e-mail, téléphone, rôle, dernière connexion, secret 2FA | Table `User` ; ADMIN/DSI/RH | Durée du compte + à fixer | Hébergeur (à confirmer) |
| T2 | Stages et évaluations | Suivi pédagogique, ordre de mérite | Stagiaires | Stage, notes, commentaires | `Internship`, `PersonEvaluation` ; tuteur, RH, coordinateur | À fixer | Idem |
| T3 | Pointage GPS | Preuve de présence | Stagiaires, agents terrain | Position, heure, précision | `Presence` ; tuteur, RH, ADMIN | À fixer (minimiser) | Idem |
| T4 | Bénéficiaires et ménages | Suivi des projets, vulnérabilité | Bénéficiaires, **dont des mineurs** | Identité, localisation, situation | `Beneficiary`, parcours ; coordinateur, DIRECTION, ADMIN | À fixer | Bailleurs (rapports agrégés) |
| T5 | Consentement des tuteurs légaux | Mineurs | Mineurs et représentants | Consentement | `/api/consents` | Durée du projet + à fixer | — |
| T6 | Analyses IA / ML | Anomalies, risque d'abandon | Stagiaires, bénéficiaires | Variables dérivées des tables ci-dessus | Services `ai`/`ml` ; accès par clé de service | Pas de stockage propre confirmé : **à vérifier** | LLM externe **uniquement si** `LLM_API_KEY` est défini |
| T7 | Journal d'audit | Sécurité, traçabilité | Tous | Action, utilisateur, entité, horodatage | `AuditLog` ; ADMIN/DSI | À fixer | — |

Colonnes « à fixer » : durées de conservation à décider par la Direction (voir `LOT11_DEMANDES_DIRECTION.md`). Une revue annuelle du registre est prévue au plan de maintenance.

## 2. Analyse d'impact (AIPD) — traitements à risque

Traitements concernés : T3 (géolocalisation), T4/T5 (mineurs, vulnérabilité), T6 (profilage par IA).

| Risque | Gravité | Mesure en place (dans le code) | Mesure à ajouter |
|---|---|---|---|
| Accès non autorisé aux données de bénéficiaires | Élevée | Rôles backend + frontend ; routes IA/chat limitées à ADMIN/DIRECTION/COORDINATOR ; audit | Revue trimestrielle des accès ; chiffrement au repos (décision hébergeur) |
| Suivi excessif par géolocalisation | Moyenne | Pointage ciblé stage/projet | Limiter la conservation ; informer les stagiaires |
| Décision automatisée défavorable (note, abandon) | Élevée | Aucune décision automatique : recommandation indicative, décision humaine tracée | Procédure de contestation par le stagiaire |
| Biais / erreurs du modèle | Moyenne | Comparaison au baseline règles ; verdict « non concluant » assumé | Revue des faux positifs à chaque réentraînement |
| Fuite via LLM externe | Élevée | LLM désactivé sans clé | Si activé : anonymiser avant envoi, contrat avec le fournisseur |
| Données de mineurs | Élevée | Consentement du tuteur légal (module dédié) | Exigences du bailleur Orange à obtenir (LOT 11) |

## 3. Procédure de gestion d'incident

1. **Détecter** : alerte de log, signalement d'un utilisateur, anomalie d'audit.
2. **Qualifier** (≤ 4 h) : DSI détermine si des données personnelles sont concernées, lesquelles, combien de personnes.
3. **Contenir** : couper l'accès (désactiver le compte → `INACTIVE`, révoquer clés `AI_SERVICE_KEY`, isoler le service).
4. **Préserver les preuves** : exporter l'`AuditLog` et les logs avant toute remise en état.
5. **Notifier** : Direction immédiatement ; autorité de contrôle et personnes concernées si la loi l'impose (délai et forme **à confirmer par un juriste** ; ne pas supposer 72 h) ; bailleur concerné si les données de ses bénéficiaires sont touchées.
6. **Corriger et récupérer** : correctif, restauration, rotation des secrets.
7. **Retour d'expérience** (≤ 2 semaines) : cause, mesure préventive, mise à jour du registre et de l'AIPD.

## 4. Droits des personnes

Accès, rectification, suppression/anonymisation, opposition. État dans la plateforme : rétention et export existent (`retention.controller`, module d'exports) ; **à vérifier** qu'une demande de suppression d'un bénéficiaire couvre aussi `AnomalyAction`, `AuditLog` (anonymiser plutôt que supprimer) et les sauvegardes. Délai de réponse interne proposé : 30 jours (à valider).

## 5. Liste à faire valider par un juriste malgache

- [ ] Obligation de déclaration/autorisation auprès de la CMIL pour T3, T4, T6.
- [ ] Délais et destinataires de la notification d'incident.
- [ ] Durées de conservation légales ou recommandées.
- [ ] Hébergement hors de Madagascar : conditions de transfert.
- [ ] Consentement des mineurs : âge, représentant légal, forme écrite.
- [ ] Mentions d'information à afficher aux stagiaires et bénéficiaires.
- [ ] Clauses avec le fournisseur LLM éventuel.
