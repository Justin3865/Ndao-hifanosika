// src/utils/chatKnowledgeRules.ts — base de connaissances du chatbot sur LE PROJET « Ndao Hifanosika ».
// Règles PURES : aucune base de données. Contenu repris de docs/GUIDE_UTILISATEUR(.mg).md, GUIDE_ADMINISTRATEUR.md,
// GUIDE_PARCOURS_COORDINATEURS.md et ANOMALIES_ET_NOTE.md ; vocabulaire malgache = celui de l'interface
// (srcf/src/lib/i18n). BROUILLON malgache : à faire relire par un locuteur avant la remise.

import { ChatLang, norm, pick } from "./chatLangRules";

type Text = Record<ChatLang, string>;

export interface KnowledgeEntry {
  id: string;
  /** Expressions (sur texte normalisé, toutes langues) ; chaque correspondance ajoute 1 point. */
  triggers: string[];
  /** Points supplémentaires si TOUS ces motifs sont présents (désambiguïsation). */
  all?: string[][];
  answer: Text;
  /** Identifiants d'autres entrées proposées ensuite. */
  next: string[];
  /** Question type proposée comme suggestion cliquable. */
  question: Text;
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: "about",
    triggers: ["ndao hifanosika", "plateforme", "platform", "sehatra", "qu'est.ce que", "what is (?:this|the)", "inona (?:ity|no|ny) (?:ny )?(?:sehatra|rafitra|ndao)", "a quoi sert", "what is it for", "ny tetikasa dia", "presentation", "overview"],
    answer: {
      fr: "« Ndao Hifanosika – Suivi & Évaluation » est la plateforme de l'ONG pour suivre les projets, activités, jalons, bénéficiaires et stagiaires (présence GPS, évaluations, ordre de mérite), produire des rapports et aider à décider grâce à l'IA. L'IA aide à décider, elle ne décide jamais : toute anomalie passe par une décision humaine.",
      en: "“Ndao Hifanosika – Monitoring & Evaluation” is the NGO's platform to track projects, activities, milestones, beneficiaries and interns (GPS attendance, evaluations, merit ranking), produce reports and support decisions with AI. The AI only helps: every anomaly goes through a human decision.",
      mg: "« Ndao Hifanosika – Fanaraha-maso & Fanombanana » no sehatra fitantanana an'ny ONG: manaraka ny tetikasa, ny hetsika, ny dingana, ny mpahazo tombontsoa ary ny stagiaire (fanatrehana GPS, fanombanana, laharan'ny fahaizana), mamoaka tatitra ary manampy amin'ny fanapahan-kevitra amin'ny alalan'ny IA. Ny IA dia manampy fotsiny: olombelona foana no mamaritra ny anomalie rehetra.",
    },
    next: ["roles", "help", "protection"],
    question: { fr: "Qu'est-ce que la plateforme Ndao Hifanosika ?", en: "What is the Ndao Hifanosika platform?", mg: "Inona ny sehatra Ndao Hifanosika?" },
  },
  {
    id: "login",
    triggers: ["connexion", "se connecter", "connecter", "log ?in", "sign ?in", "fidirana", "hiditra", "inscri", "creer un compte", "create (?:an )?account", "hamorona kaonty", "kaonty", "oubli", "forgot", "adino", "2fa", "double authentification", "two.factor", "fanamarinana roa"],
    answer: {
      fr: "Ouvrez la plateforme → Connexion → e-mail et mot de passe (code à 6 chiffres si la double authentification est activée). Mot de passe oublié : « Mot de passe oublié ? ». Pas de compte : « Créer un compte », puis attendez la validation de l'administrateur.",
      en: "Open the platform → Login → e-mail and password (6-digit code if two-factor authentication is on). Forgot your password: “Forgot password?”. No account: “Create an account”, then wait for the administrator's approval.",
      mg: "Sokafy ny sehatra → Fidirana → mailaka sy teny miafina (kaody 6 isa raha misy fanamarinana roa). Adino ny teny miafina? Tsindrio ny « Adino ny teny miafina? ». Tsy manana kaonty? Tsindrio ny Hamorona kaonty, dia miandrasa ny fankatoavan'ny mpitantana.",
    },
    next: ["password", "roles"],
    question: { fr: "Comment me connecter ou créer un compte ?", en: "How do I log in or create an account?", mg: "Ahoana no hidirana na hamoronana kaonty?" },
  },
  {
    id: "language",
    triggers: ["langue", "language", "fiteny", "malagasy", "anglais", "english", "francais", "french", "traduction", "translat", "dikan-teny", "mandika", "traduire", "switch (?:to )?(?:fr|en|mg)", "\\b(?:fr|en|mg)\\b.*(?:bouton|button|bokotra)"],
    answer: {
      fr: "Le bouton FR / EN / MG en haut change toute l'interface en français, anglais ou malagasy ; votre choix est mémorisé. Les textes saisis par les utilisateurs restent dans leur langue d'origine. Le chatbot répond dans la langue de votre question.",
      en: "The FR / EN / MG button at the top switches the whole interface to French, English or Malagasy; your choice is remembered. Text typed by users stays in its original language. The chatbot answers in the language of your question.",
      mg: "Ny bokotra FR / EN / MG eo ambony no manova ny interface manontolo ho amin'ny teny frantsay, anglisy na malagasy; tadidiana ny safidinao. Ny soratra nampidirin'ny mpampiasa dia mijanona amin'ny fitenin'izy ireo. Ny chatbot dia mamaly amin'ny fiteny nampiasainao tamin'ny fanontaniana.",
    },
    next: ["help", "login"],
    question: { fr: "Comment changer la langue ?", en: "How do I change the language?", mg: "Ahoana no anovana ny fiteny?" },
  },
  {
    id: "roles",
    triggers: ["role", "andraikitra", "permission", "droits?", "acces", "access", "fidirana amin", "qui voit", "who can see", "iza no mahita", "perimetre", "scope", "voatendry", "assigned", "affect", "coordinat", "mpandrindra", "direction"],
    answer: {
      fr: "Ce que vous voyez dépend de votre rôle. Un coordinateur affecté à des projets ne voit que ces projets (listes, tableaux de bord, rapports, carte des zones) ; la Direction et l'administrateur ont la vue d'ensemble. Les pages globales (résumé IA, anomalies, chatbot…) ne sont pas ouvertes à un coordinateur limité à ses projets : il utilise les vues par projet. Un coordinateur sans affectation garde l'accès à tous les projets (mode transition).",
      en: "What you see depends on your role. A coordinator assigned to projects only sees those projects (lists, dashboards, reports, zone map); Direction and the administrator get the overall view. Global pages (AI summary, anomalies, chatbot…) are not open to a coordinator limited to their projects: they use the per-project views. A coordinator with no assignment keeps access to all projects (transition mode).",
      mg: "Ny hitanao dia miankina amin'ny andraikitrao. Ny mpandrindra voatendry amin'ny tetikasa dia mahita ireo tetikasa ireo ihany (lisitra, tabilao fitarihana, tatitra, sarintanin'ny faritra); ny Direction sy ny mpitantana dia mahita ny ankapobeny. Ny pejy iombonana (famintinana IA, anomalie, chatbot…) dia tsy misokatra ho an'ny mpandrindra voafetra amin'ny tetikasany: ampiasainy ny fijery isaky ny tetikasa. Ny mpandrindra tsy mbola voatendry dia mbola mahita ny tetikasa rehetra (fotoana fifindrana).",
    },
    next: ["assign", "protection"],
    question: { fr: "Qui voit quoi selon le rôle ?", en: "Who sees what depending on the role?", mg: "Iza no mahita inona araka ny andraikitra?" },
  },
  {
    id: "assign",
    triggers: ["affecter", "assign", "tendreo", "atokana", "retirer l'affectation", "coordinateurs? (?:de|du) projet", "mpandrindra.*tetikasa", "project coordinator"],
    all: [["coordinat|mpandrindra", "projet|project|tetikasa"]],
    answer: {
      fr: "Menu Organisation → Coordinateurs (administrateur et Direction) : choisissez le coordinateur et le projet puis « Affecter » ; la croix à côté du nom retire l'affectation. Un utilisateur doit avoir le rôle Coordinateur (créé dans « Utilisateurs ») pour apparaître dans la liste. Affectez les projets avant de passer en mode strict, sinon le coordinateur ne verra plus rien.",
      en: "Organisation menu → Coordinators (administrator and Direction): pick the coordinator and the project, then “Assign”; the cross next to the name removes the assignment. A user must have the Coordinator role (created under “Users”) to appear in the list. Assign projects before switching to strict mode, otherwise the coordinator will see nothing.",
      mg: "Menio Fikambanana → Mpandrindra (mpitantana sy Direction): fidio ny mpandrindra sy ny tetikasa, dia tsindrio ny « Affecter »; ny x eo akaikin'ny anarana no manala ny fanendrena. Tsy maintsy manana andraikitra Mpandrindra (noforonina ao amin'ny « Mpampiasa ») ny olona vao hiseho ao amin'ny lisitra. Tendreo aloha ny tetikasa alohan'ny hampiasana ny fomba strict, raha tsy izany dia tsy hahita na inona na inona ny mpandrindra.",
    },
    next: ["roles"],
    question: { fr: "Comment affecter un coordinateur à un projet ?", en: "How do I assign a coordinator to a project?", mg: "Ahoana no anendrena mpandrindra amin'ny tetikasa?" },
  },
  {
    id: "add_beneficiary",
    triggers: ["ajouter (?:un )?benef", "add (?:a )?benef", "nouveau benef", "new benef", "enregistrer (?:un )?benef", "register (?:a )?benef", "hanampy mpahazo", "hanampi\\w* mpahazo", "manampy mpahazo", "ampio mpahazo", "mpahazo tombontsoa vaovao", "mpandray anjara vaovao", "creer (?:un )?benef", "cin\\b", "carte d'identite", "id number"],
    answer: {
      fr: "Bénéficiaires → Ajouter un bénéficiaire : nom, sexe, date de naissance (l'âge est calculé), CIN (12 chiffres) et téléphone (10 chiffres). Le statut du parcours (en cours, terminé, abandon) se renseigne ensuite dans la page « Parcours ».",
      en: "Beneficiaries → Add a beneficiary: name, sex, date of birth (age is computed), national ID/CIN (12 digits) and phone (10 digits). The journey status (active, completed, dropped out) is then set on the “Journey” page.",
      mg: "Mpahazo tombontsoa → Hanampy mpahazo tombontsoa: anarana, lahy/vavy, daty nahaterahana (kajiana ho azy ny taona), CIN 12 isa ary finday 10 isa. Ny toetran'ny dingana arahina (mavitrika, vita, nijanona) dia soratana ao amin'ny pejy « Dingana arahina ».",
    },
    next: ["journey", "protection"],
    question: { fr: "Comment ajouter un bénéficiaire ?", en: "How do I add a beneficiary?", mg: "Ahoana no hanampiana mpahazo tombontsoa?" },
  },
  {
    id: "journey",
    triggers: ["parcours", "journey", "dingana arahina", "taux d'abandon", "dropout rate", "tahan'ny fijanonana", "statut du parcours", "journey status", "nialana", "dropped out"],
    answer: {
      fr: "La page « Parcours » (Programmes → Parcours) indique pour chaque bénéficiaire si le parcours est en cours, terminé ou en abandon (date, et motif facultatif). Taux d'abandon = abandons / (terminés + abandons) : les parcours en cours sont exclus. Un bénéficiaire sans statut est considéré « en cours ». Administrateur et coordinateurs (limités à leurs projets) modifient ; la Direction consulte.",
      en: "The “Journey” page (Programmes → Journey) shows, for each beneficiary, whether the journey is active, completed or dropped out (date, optional reason). Dropout rate = dropouts / (completed + dropouts): ongoing journeys are excluded. A beneficiary with no status counts as “active”. The administrator and coordinators (limited to their projects) can edit; Direction can read.",
      mg: "Ny pejy « Dingana arahina » (Programa → Dingana arahina) dia mampiseho ny mpahazo tombontsoa tsirairay: mavitrika, vita na nijanona (daty, ary antony raha tiana). Tahan'ny fijanonana = fijanonana / (vita + fijanonana): tsy ao anatin'izany ny dingana mbola mandeha. Ny mpahazo tombontsoa tsy manana toetra dia raisina ho mavitrika. Ny mpitantana sy ny mpandrindra (voafetra amin'ny tetikasany) no mamoaka ovàna; ny Direction dia mijery fotsiny.",
    },
    next: ["dropout_risk", "add_beneficiary"],
    question: { fr: "Comment fonctionne le suivi du parcours et le taux d'abandon ?", en: "How do journey tracking and the dropout rate work?", mg: "Ahoana ny fanarahana ny dingana sy ny tahan'ny fijanonana?" },
  },
  {
    id: "dropout_risk",
    triggers: ["risque d'abandon", "dropout risk", "loza hijanonana", "score de risque", "risk score", "isa 0", "seuil", "threshold", "entrain(?:er|ement) (?:du )?modele", "train(?:ing)? (?:the )?model", "ampiofan", "non concluant", "inconclusive", "fiabilite", "reliab", "30 parcours"],
    answer: {
      fr: "Le risque d'abandon est un score de 0 à 100 calculé par règles (projet à l'arrêt, jalons en retard, évaluations faibles, vulnérabilité…) ; « élevé » à partir de 60. C'est une aide pour décider qui visiter en premier, pas un jugement sur la personne : vérifiez toujours sur le terrain. L'entraînement d'un modèle appris (Analyses IA › Modèles, administrateur) exige au moins 30 parcours clos dont 5 de chaque classe ; sous 100, les résultats sont seulement indicatifs, sinon le résultat est « non concluant » et les règles restent utilisées.",
      en: "Dropout risk is a 0–100 score computed by rules (stalled project, late milestones, low evaluations, vulnerability…); “high” starts at 60. It helps decide whom to visit first; it is not a judgement of the person: always verify in the field. Training a learned model (AI Analyses › Models, administrator) needs at least 30 closed journeys with 5 of each class; below 100 the results are only indicative, otherwise the outcome is “inconclusive” and the rules stay in use.",
      mg: "Ny loza hijanonana dia isa 0 ka hatramin'ny 100 kajiana araka ny fitsipika (tetikasa nijanona, dingana tara, fanombanana ambany, maha-marefo…); « avo » manomboka amin'ny 60. Fanampiana hanapahana hoe iza no vaovao tsidihana aloha izany, fa tsy fitsarana ny olona: hamarino foana eny an-tsaha. Ny fampiofanana modely (Famakafakana IA › Modely, mpitantana) dia mila dingana vita 30 farafahakeliny ary 5 isaky ny sokajy; ambanin'ny 100 dia manondro fotsiny ny valiny, ary raha tsy ampy dia « tsy mazava » ny valiny ary ny fitsipika foana no ampiasaina.",
    },
    next: ["journey", "anomaly"],
    question: { fr: "Comment est calculé le risque d'abandon ?", en: "How is the dropout risk computed?", mg: "Ahoana no kajiana ny loza hijanonana?" },
  },
  {
    id: "report",
    triggers: ["rapport", "report", "tatitra", "pdf", "generer", "generate", "hamoronina", "hamoaka tatitra", "produce a report"],
    all: [["rapport|report|tatitra|pdf"]],
    answer: {
      fr: "Pilotage → Rapports : choisissez le type et la période → « Générer le rapport » → « Télécharger le PDF ». Les rapports par projet respectent votre périmètre (un coordinateur ne voit que ses projets).",
      en: "Control menu (Pilotage) → Reports: choose the type and the period → “Generate the report” → “Download the PDF”. Per-project reports respect your scope (a coordinator only sees their own projects).",
      mg: "Fitarihana → Tatitra: safidio ny karazana sy ny vanim-potoana → « Hamoronina ny tatitra » → « Alaina ny PDF ». Ny tatitra isaky ny tetikasa dia manaraka ny périmètre-nao (ny mpandrindra dia mahita ny tetikasany ihany).",
    },
    next: ["export", "roles"],
    question: { fr: "Comment produire un rapport PDF ?", en: "How do I produce a PDF report?", mg: "Ahoana no mamoaka tatitra PDF?" },
  },
  {
    id: "export",
    triggers: ["export", "exporter", "telecharg", "download", "excel", "xlsx", "csv", "json", "fanondranana", "alaina"],
    answer: {
      fr: "Menu Pilotage → Export JSON (page « Exports de données ») : téléchargez les données en Excel (.xlsx) ou CSV (« Télécharger tout » pour l'ensemble), et en JSON. Les colonnes de noms des jeux de données sont remplacées par des initiales pour les rôles sans accès complet.",
      en: "Control menu (Pilotage) → Export JSON (“Data exports” page): download data as Excel (.xlsx) or CSV (“Download all” for everything), and as JSON. Name columns in datasets are replaced by initials for roles without full access.",
      mg: "Menio Fitarihana (Pilotage) → Fanondranana JSON (pejy « Fakana angona »): alaina amin'ny Excel (.xlsx) na CSV ny angona (« Alao daholo » ho an'ny rehetra), ary amin'ny JSON. Ny tsanganana anarana ao amin'ny angona dia soloina litera voalohany ho an'ny andraikitra tsy manana fidirana feno.",
    },
    next: ["report", "protection"],
    question: { fr: "Comment exporter les données en Excel ou CSV ?", en: "How do I export data to Excel or CSV?", mg: "Ahoana no alaina amin'ny Excel na CSV ny angona?" },
  },
  {
    id: "notification",
    triggers: ["notification", "fampandrenesana", "alerte", "alert", "marquer comme lu", "mark as read", "atao voavaky", "archiv", "arisiva", "push"],
    answer: {
      fr: "Menu Système → Notifications : lisez vos alertes, puis « Marquer comme lu » ou « Archiver ». Vous pouvez activer les notifications sur cet appareil. Les alertes critiques d'anomalies sont aussi envoyées par e-mail.",
      en: "System menu → Notifications: read your alerts, then “Mark as read” or “Archive”. You can turn on notifications on this device. Critical anomaly alerts are also sent by e-mail.",
      mg: "Menio Rafitra → Fampandrenesana: vakio ny fampandrenesana, dia tsindrio ny « Atao voavaky » na « Tahirizina any amin'ny arisiva ». Azonao alefa ny fampandrenesana amin'ity fitaovana ity. Ny fampitandremana manan-danja momba ny anomalie dia alefa amin'ny mailaka koa.",
    },
    next: ["anomaly"],
    question: { fr: "Comment gérer mes notifications ?", en: "How do I manage my notifications?", mg: "Ahoana no fitantanana ny fampandrenesana?" },
  },
  {
    id: "password",
    triggers: ["changer (?:mon |le )?mot de passe", "change (?:my |the )?password", "hanova teny miafina", "teny miafina", "mot de passe", "password", "12 caracteres", "12 characters", "securite", "security", "fiarovana"],
    answer: {
      fr: "Paramètres → Sécurité : le mot de passe doit faire au moins 12 caractères. La double authentification (code à 6 chiffres) peut être activée au même endroit.",
      en: "Settings → Security: the password must be at least 12 characters long. Two-factor authentication (6-digit code) can be turned on in the same place.",
      mg: "Fanamboarana → Fiarovana: ny teny miafina dia tsy maintsy misy 12 isa na litera farafahakeliny. Azo alefa koa eo ihany ny fanamarinana roa (kaody 6 isa).",
    },
    next: ["login"],
    question: { fr: "Comment changer mon mot de passe ?", en: "How do I change my password?", mg: "Ahoana no anovana ny teny miafina?" },
  },
  {
    id: "mission",
    triggers: ["mission", "ny asako", "my mission", "enquete", "survey", "fanadihadiana", "terrain", "field", "an-tsaha", "partager ma position", "share (?:my )?location", "zarao ny toerana", "gps"],
    answer: {
      fr: "« Ma mission (GPS) » (menu Pilotage) sert aux enquêtes de terrain : vous pouvez partager votre position pour qu'on trouve l'agent le plus proche d'un ménage, et l'arrêter à tout moment. Seules les positions récentes (moins de 6 heures) sont utilisées.",
      en: "“My mission (GPS)” (Pilotage menu) is for field surveys: you may share your location so the nearest agent to a household can be found, and stop sharing at any time. Only recent positions (under 6 hours) are used.",
      mg: "« Ny asako (GPS) » (menio Fitarihana) dia ho an'ny fanadihadiana an-tsaha: azonao zaraina ny toerana misy anao mba hahitana ny mpiasa akaiky indrindra ny tokantrano iray, ary azonao atsahatra foana. Ny toerana vao haingana ihany (latsaky ny 6 ora) no ampiasaina.",
    },
    next: ["zones", "protection"],
    question: { fr: "À quoi sert « Ma mission (GPS) » ?", en: "What is “My mission (GPS)” for?", mg: "Inona ny ilàna ny « Ny asako (GPS) »?" },
  },
  {
    id: "zones",
    triggers: ["zones? d'intervention", "intervention zones?", "faritra iasana", "carte des zones", "zone map", "sarintanin'ny faritra", "vulnerabilite par zone", "vulnerability by zone", "hamaroan'ny marefo"],
    answer: {
      fr: "Menu Organisation → Zones d'intervention (administrateur et Direction) : carte des zones et vulnérabilité par zone (part de ménages vulnérables, altitude, score). Je peux aussi comparer deux zones : « Compare Fianarantsoa et Antananarivo ».",
      en: "Organisation menu → Intervention zones (administrator and Direction): zone map and vulnerability by zone (share of vulnerable households, altitude, score). I can also compare two zones: “Compare Fianarantsoa and Antananarivo”.",
      mg: "Menio Fikambanana → Faritra iasana (mpitantana sy Direction): sarintanin'ny faritra sy ny hamaroan'ny marefo isaky ny faritra (isan-jaton'ny tokantrano marefo, haavo, isa). Afaka mampitaha faritra roa koa aho: « Ampitaho Fianarantsoa sy Antananarivo ».",
    },
    next: ["mission", "dropout_risk"],
    question: { fr: "Où voir la vulnérabilité par zone ?", en: "Where can I see vulnerability by zone?", mg: "Aiza no hijerena ny fahamarefoana isaky ny faritra?" },
  },
  {
    id: "protection",
    triggers: ["protection", "prot[eé]g", "masque", "masked", "saronana", "\\u2022", "•", "initiales", "initials", "mineur", "minor", "enfant", "child", "ankizy", "vulnerable woman", "femme vulnerable", "vehivavy marefo", "donnees sensibles", "sensitive data", "confidential", "rgpd", "gdpr", "consentement", "consent", "fanekena"],
    answer: {
      fr: "Pour protéger les enfants et les femmes vulnérables, certaines données sont masquées selon votre rôle : initiales au lieu du nom, téléphone/e-mail/CIN partiels, position arrondie, année de naissance seule. « ••• » signale une donnée masquée : ne la recopiez pas dans un formulaire (elle serait refusée). Chaque lecture de ces données est journalisée. Si votre travail l'exige, demandez l'accès au coordinateur ou à l'administrateur.",
      en: "To protect children and vulnerable women, some data is masked depending on your role: initials instead of the name, partial phone/e-mail/ID, rounded location, birth year only. “•••” marks masked data: do not copy it into a form (it would be rejected). Every read of this data is logged. If your work requires it, ask the coordinator or the administrator for access.",
      mg: "Mba hiarovana ny ankizy sy ny vehivavy marefo, misy angona saronana araka ny andraikitrao: litera voalohany fa tsy anarana feno, finday/mailaka/CIN tsy feno, toerana voahodikodina, taona nahaterahana fotsiny. Ny « ••• » dia manondro angona saronana: aza adika ao anaty fiopaka ny sanda saronana (ho lavina izany). Voasoratra ny famakiana ireo angona ireo. Raha ilaina amin'ny asanao, angataho amin'ny mpandrindra na ny mpitantana.",
    },
    next: ["roles", "troubleshooting"],
    question: { fr: "Pourquoi certaines données sont-elles masquées (•••) ?", en: "Why is some data masked (•••)?", mg: "Nahoana no misy angona saronana (•••)?" },
  },
  {
    id: "anomaly",
    triggers: ["anomalie", "anomaly", "anomalies", "hadisoana", "jour non ouvrable", "non.working", "tsy fiasana", "justifi", "confirm", "en verification", "in review", "penalite", "penalty", "sazy", "note recommandee", "mark recommendation", "naoty"],
    answer: {
      fr: "Un jour non ouvrable (samedi, dimanche, jour férié, fermeture de l'ONG) ne devrait comporter aucune présence : si c'est le cas, le cas est signalé et vérifié avant d'entrer dans la note, jamais sanctionné automatiquement. Le tuteur, la RH, la Direction ou l'administrateur le marque « justifié » (sans impact), « confirmé » ou « en vérification ». À partir de 3 cas sans décision sur un stage, une anomalie critique est créée. Chaque cas confirmé propose de retirer 0,25 pt sur 20 (plafond 2 pt) : la note existante n'est pas modifiée, la RH décide.",
      en: "A non-working day (Saturday, Sunday, public holiday, NGO closure) should have no attendance: if there is some, the case is flagged and checked before it counts towards the grade, never penalised automatically. The tutor, HR, Direction or the administrator marks it “justified” (no impact), “confirmed” or “under review”. From 3 cases without a decision on one internship, a critical anomaly is raised. Each confirmed case suggests removing 0.25 pt out of 20 (cap 2 pt): the existing grade is not changed, HR decides.",
      mg: "Ny andro tsy fiasana (Asabotsy, Alahady, andro firavoravoana, andro fanakatonana ny ONG) dia tsy tokony hisy fanatrehana: raha misy, dia asiana marika ary hamarinina alohan'ny hidirany amin'ny naoty, fa tsy asiana sazy ho azy. Ny mpitari-dalana (tuteur), ny RH, ny Direction na ny mpitantana no mametraka azy ho « voamarina fa mahazatra » (tsy misy fiantraikany), « voaporofo » na « eo am-pamarinana ». Raha 3 na mihoatra ny tranga tsy mbola voafaritra amin'ny stage iray, dia misy anomalie manan-danja. Ny tranga voaporofo tsirairay dia manoro hanala 0,25 isa amin'ny 20 (hatramin'ny 2 isa): tsy ovaina ny naoty efa misy, ny RH no mamaritra.",
    },
    next: ["notification", "dropout_risk"],
    question: { fr: "Comment sont traitées les anomalies de présence avant la note ?", en: "How are attendance anomalies handled before the grade?", mg: "Ahoana no fiasan'ny anomalie momba ny fanatrehana alohan'ny naoty?" },
  },
  {
    id: "internship",
    triggers: ["stage", "stagiaire", "internship", "intern\\b", "interns", "trainee", "mpianatra", "ordre de merite", "merit", "laharan'ny fahaizana", "tuteur", "tutor", "mpitari-dalana"],
    answer: {
      fr: "Le module Stages suit les stagiaires : présence pointée avec GPS, tâches et comptes rendus, évaluations et ordre de mérite. Le tuteur et la RH suivent chaque stage ; les anomalies de présence sont vérifiées avant la publication de la note (page « Anomalies & note »).",
      en: "The Internships module tracks interns: GPS-stamped attendance, tasks and daily reports, evaluations and merit ranking. The tutor and HR follow each internship; attendance anomalies are checked before the grade is published (“Anomalies & grade” page).",
      mg: "Ny modely Stage dia manaraka ny stagiaire: fanatrehana voamarika GPS, asa sy tatitra isan'andro, fanombanana ary laharan'ny fahaizana. Ny mpitari-dalana (tuteur) sy ny RH no manara-maso ny stage tsirairay; ny anomalie momba ny fanatrehana dia hamarinina alohan'ny famoahana ny naoty (pejy « Anomalies & note »).",
    },
    next: ["anomaly", "roles"],
    question: { fr: "Comment fonctionne le suivi des stagiaires ?", en: "How does intern tracking work?", mg: "Ahoana ny fanarahana ny stagiaire?" },
  },
  {
    id: "troubleshooting",
    triggers: ["probleme", "problem", "erreur", "error", "olana", "tsy mandeha", "ne marche pas", "doesn't work", "not working", "403", "refus", "denied", "tsy mahazo miditra", "can't access", "cannot access", "page vide", "empty page", "pejy foana", "liste vide", "empty list", "422"],
    answer: {
      fr: "« Accès refusé / 403 » : la donnée est hors de votre périmètre ou la page est globale (voir « rôles »). « Valeur masquée / 422 » : le formulaire contient des valeurs masquées (•••) ; rechargez-le avec un rôle autorisé. Page ou liste vide : vérifiez qu'un projet vous est affecté. Autre cas : contactez la DSI en indiquant la page, l'heure et ce que vous faisiez.",
      en: "“Access denied / 403”: the data is outside your scope or the page is global (see “roles”). “Masked value / 422”: the form contains masked values (•••); reload it with an authorised role. Empty page or list: check that a project is assigned to you. Anything else: contact IT (DSI) with the page, the time and what you were doing.",
      mg: "« Tsy azo idirana / 403 »: ivelan'ny périmètre-nao ilay angona na pejy iombonana izy (jereo ny « andraikitra »). « Sanda saronana / 422 »: misy sanda saronana (•••) ao amin'ny fiopaka; ataovy averina ny fakana azy amin'ny andraikitra misy alalana. Pejy na lisitra foana: jereo raha misy tetikasa voatendry aminao. Raha hafa: mifandraisa amin'ny DSI miaraka amin'ny pejy, ora ary ny nataonao.",
    },
    next: ["roles", "protection"],
    question: { fr: "Que faire en cas d'erreur « accès refusé » ?", en: "What should I do on an “access denied” error?", mg: "Inona no atao rehefa misy hafatra « tsy azo idirana »?" },
  },
  {
    id: "help",
    triggers: ["^(?:aide|help|fanampiana)\\b", "que sais.tu", "que peux.tu", "what can you", "what do you", "inona no azonao", "azonao atao", "afaka manao inona", "capacit", "fonctionnalit", "features", "azo atao"],
    answer: {
      fr: "Je réponds en français, anglais ou malagasy. Je peux : donner l'état et les chiffres des projets, activités, bénéficiaires, évaluations et stages ; classer les ménages vulnérables et comparer des zones ; trouver l'agent le plus proche ; parler des anomalies et jours fériés ; expliquer le fonctionnement de la plateforme (connexion, rôles, rapports, exports, protection des données…) ; et traduire un terme ou une phrase entre français, anglais et malagasy (« traduis … en malagasy »).",
      en: "I answer in French, English or Malagasy. I can: give the status and figures for projects, activities, beneficiaries, evaluations and internships; rank vulnerable households and compare zones; find the nearest agent; discuss anomalies and public holidays; explain how the platform works (login, roles, reports, exports, data protection…); and translate a term or sentence between French, English and Malagasy (“translate … into Malagasy”).",
      mg: "Mamaly amin'ny teny frantsay, anglisy na malagasy aho. Afaka manome ny toetra sy ny isan'ny tetikasa, hetsika, mpahazo tombontsoa, fanombanana ary stage aho; mandrafitra ny tokantrano marefo sy mampitaha faritra; mitady ny mpiasa akaiky indrindra; miresaka momba ny anomalie sy ny andro firavoravoana; manazava ny fampiasana ny sehatra (fidirana, andraikitra, tatitra, fanondranana, fiarovana ny angona…); ary mandika teny na fehezanteny eo amin'ny frantsay, anglisy ary malagasy (« adikao amin'ny frantsay … »).",
    },
    next: ["about", "language", "roles"],
    question: { fr: "Que sais-tu faire ?", en: "What can you do?", mg: "Inona no azonao atao?" },
  },
];

const BY_ID = new Map(KNOWLEDGE.map((e) => [e.id, e]));
const COMPILED = KNOWLEDGE.map((e) => ({
  e,
  triggers: e.triggers.map((t) => new RegExp(norm(t))),
  all: (e.all ?? []).map((group) => group.map((g) => new RegExp(norm(g)))),
}));

export interface KnowledgeHit {
  entry: KnowledgeEntry;
  score: number;
}

/** Meilleure entrée pour la question, ou null si rien de pertinent (score minimal 1). */
export function matchKnowledge(text: string): KnowledgeHit | null {
  const t = norm(text);
  let best: KnowledgeHit | null = null;
  for (const c of COMPILED) {
    let score = c.triggers.reduce((n, re) => n + (re.test(t) ? 1 : 0), 0);
    if (score === 0) continue;
    for (const group of c.all) if (group.every((re) => re.test(t))) score += 2;
    if (!best || score > best.score) best = { entry: c.e, score };
  }
  return best;
}

export const knowledgeAnswer = (entry: KnowledgeEntry, lang: ChatLang): string => pick(entry.answer, lang);

/** Suggestions cliquables dans la langue demandée (questions complètes, prêtes à renvoyer au chatbot). */
export function knowledgeSuggestions(entry: KnowledgeEntry | null, lang: ChatLang, limit = 4): string[] {
  const ids = entry ? entry.next : ["about", "roles", "add_beneficiary", "anomaly"];
  return ids.map((id) => BY_ID.get(id)).filter((e): e is KnowledgeEntry => !!e).slice(0, limit).map((e) => pick(e.question, lang));
}

export const knowledgeById = (id: string): KnowledgeEntry | undefined => BY_ID.get(id);
