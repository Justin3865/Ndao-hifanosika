# Chiffrement au repos (cahier §10) — ce que le code ne peut pas faire seul

Le code chiffre déjà les mots de passe (bcrypt) et le secret 2FA (AES-256-GCM). Le chiffrement des **données stockées** (base, fichiers, sauvegardes) dépend de l'hébergement : il se règle à l'infrastructure, pas dans l'application. Ce document dit quoi demander et comment le vérifier. **Aucune de ces mesures n'est en place tant que l'hébergement n'est pas choisi** (demande 1 de `LOT11_DEMANDES_DIRECTION.md`).

| Option | Quand | Ce qu'il faut |
|---|---|---|
| Base managée chez un hébergeur | Production cloud | Activer « encryption at rest » (souvent cochée par défaut) et la conserver pour les sauvegardes et réplicas |
| Serveur à soi (VPS) | Docker Compose actuel | Disque ou volume chiffré (LUKS/dm-crypt) pour le volume PostgreSQL et le dossier des sauvegardes |
| Sauvegardes hors serveur | Dans tous les cas | Chiffrer le fichier avant envoi (ex. `age` ou `gpg`), clé stockée **séparément** de la sauvegarde |

**Point d'attention propre à ce projet.** Les fichiers de stage et preuves sont stockés dans PostgreSQL (BYTEA) : ils sont donc couverts par le chiffrement de la base, mais pèsent sur la taille des sauvegardes. Si le volume devient important (milliers de fichiers), prévoir un stockage objet chiffré à part.

**Vérification (à garder comme preuve pour l'AIPD).** Capture ou export de la configuration de chiffrement de l'hébergeur ; résultat d'un test de restauration d'une sauvegarde chiffrée avec `deploy/scripts/test-restore.sh` ; date et responsable. Sans cette preuve, ne pas affirmer dans le mémoire que les données sont chiffrées au repos.
