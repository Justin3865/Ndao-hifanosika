# Torolalana ho an'ny administratera — Ndao Hifanosika

Ho an'ny ADMIN sy DSI. Fanampiana fotsiny ny fanovana rehetra: tsy misy soratra efa misy ovaina, ary azo esorina daholo.

## 1. Ny ao anatin'ny zip
| Lahatahiry | Votoatiny |
|---|---|
| `srcb/` | fitsipika sy middleware fiarovana angona sy périmètre; route `GET /api/service/dropout-features`; script `appliquer-protection-perimetre.py`; test |
| `ml_service/` | `compare_live.py` (baseline sy ML amin'ny label tena izy) |
| `srcf/` | diksionera malagasy lehibe (`phrases.mg.ts`), `AutoTranslate`, `appliquer-malagasy.py` |
| `docs/` | torolalana, architecture IA/ML |

## 2. Fametrahana
1. Manaova backup ny base sy ny kaody.
2. Adikao ao amin'ny tetikasa ny votoatin'ny zip (rakitra vaovao rehetra, tsy misy manosika rakitra efa misy).
3. Backend: `python appliquer-protection-perimetre.py` (manampy andalana 4 ao amin'ny `src/app.ts`), avy eo `npm run check` ary avereno alefa.
4. Frontend: `python appliquer-malagasy.py` (andalana 2 ao amin'ny `layout.tsx`), avy eo `npm run build`.
5. Hamerina: `--revert`. Tsy ilaina ny migration base.

## 3. Variables d'environnement
| Variable | Default | Fiantraikany |
|---|---|---|
| `DATA_PROTECTION_MODE` | `enforce` | `audit` = manoratra ihany fa tsy manarona; `off` = tsy mandeha |
| `DATA_PROTECTION_FULL_ROLES` | `ADMIN,COORDINATOR` | mahita ny zava-drehetra (voasoratra ny famakiana) |
| `DATA_PROTECTION_LIMITED_ROLES` | `DIRECTION` | hita ny anarana; saronana ny finday/CIN/adiresy, GPS voahodikodina |
| `PROTECT_MIN_CELL` | `5` | tsy aseho ny isa 1 ka hatramin'ny 4 |
| `COORDINATOR_SCOPE` | (foana) | `strict` = tsy mahita na inona na inona ny coordinateur tsy manana tetikasa |
| `COORDINATOR_AGGREGATES` | (foana) | `allow` = averina ny fitondran-tena taloha ho an'ny pejy mitambatra |
Soso-kevitra: herinandro amin'ny `audit`, jereo ny diary, avy eo `enforce`.

## 4. Périmètre an'ny coordinateur
Ny coordinateur voatendry amin'ny tetikasa dia mahita ireo tetikasa ireo ihany, na ao amin'ny:
- `/vulnerability/zones` sy `/reports/dashboard`: kajiana indray amin'ireo tetikasa ireo (tsy aseho ny score ML iombonana);
- `reports/beneficiaries`, `reports/evaluations`, `monitoring/overview`, `ai/performance`, `ai/dropout-risk`, `ai/households`: esorina ny andalana any ivelan'ny périmètre, kajiana indray ny totaux;
- `reports|monitoring|integration /projects/:id`: 403 raha tsy ao anatin'ny périmètre;
- **pejy mitambatra tsy azo sivanina** (famintinana IA, anomalies, narrative, kisary, fampitahana, angona fampiofanana, modely, chatbot, integration overview): 403 miaraka amin'ny hafatra. Mbola azon'ny ADMIN/DIRECTION/DSI ireo.
Ny coordinateur tsy manana tetikasa dia mitazona ny fidirana taloha raha tsy `COORDINATOR_SCOPE=strict`.

## 5. Fiarovana ny ankizy sy ny vehivavy marefo
**Olona voaaro**: latsaky ny 18 taona; vehivavy voalaza marefo na manana handicap.
| Haavo | Andraikitra default | Hitany |
|---|---|---|
| Feno | ADMIN, COORDINATOR | ny rehetra; voasoratra isaky ny famakiana (`PROTECTED_DATA_READ`, isa fotsiny) |
| Voafetra | DIRECTION | anarana, taona, tetikasa; saronana ny fifandraisana, CIN, adiresy, naoty; GPS ~1 km; taona nahaterahana fotsiny |
| Fanafenana anarana | ny hafa | litera voalohany fotsiny; tsy misy fifandraisana/maha-izy/toerana |
Tsy azo tahirizina indray ny sanda saronana (`•••`): 422 `MASKED_VALUE_REJECTED`. Mihatra amin'ny `/beneficiaries`, `/vulnerability`, `/ai`, `/reports`, `/journey`, `/follow-ups`, `/tracking`, `/certificates`, `/evaluations`, `/monitoring`, `/integration`.
**Fanamarihana**: (a) ny CSV `/ai/datasets/*/export.csv` dia mampiasa litera voalohany amin'ny tsanganana `name` ho an'ny andraikitra rehetra tsy feno; (b) tsy tratra ny sahan-tsoratra malalaka amin'ny tabilao hafa; (c) fiarovana ara-teknika ity: tsy mba soloina ny politika fankatoavana (mpiahy ara-dalàna ho an'ny ankizy) na ny fanadihadiana momba ny fiantraikany.

## 6. Fanombanana ny modely loza hijanonana
1. Ny coordinateur dia mameno ny toetran'ny parcours (mavitrika / vita / nijanona) isaky ny mpahazo tombontsoa.
2. Raiso ny jeton ADMIN (na `NDAO_EMAIL`/`NDAO_PASSWORD`, + `NDAO_2FA_CODE` raha misy 2FA):
```
set BACKEND_URL=http://localhost:4000
set AI_SERVICE_KEY=<clé backend>
set NDAO_API_TOKEN=<jeton ADMIN>
cd ml_service && python compare_live.py --out rapport_live
```
3. Vakio `rapport_live/rapport.md`: isa, validation isaky ny tetikasa, AUC / PR-AUC / rappel / F1, famaranana mailo tsy mitaha.
4. Farafahakeliny: parcours vita 30 (5 isaky ny kilasy); ambanin'ny 100 dia manondro fotsiny. Tsy miaraka amin'ny aterineto: `--labels-csv` sy `--features-csv`.

## 7. Dikanteny malagasy
Ny bokotra fiteny dia mandika ny interface manontolo: ny soratra frantsay fantatra ao amin'ny `phrases.mg.ts` dia adika rehefa aseho; averina frantsay rehefa miova. Ny soratra tsy fantatra dia mijanona amin'ny frantsay. Hanampy teny: andalana vaovao `["texte français", "teny malagasy"]`. Hanilika faritra: `data-no-translate`.

## 8. Fikojakojana
| Soritr'aretina | Antony | Hetsika |
|---|---|---|
| Coordinateur: 403 "vue agrégée" | pejy iombonana | ampiasao ny fijery isaky ny tetikasa, na `COORDINATOR_AGGREGATES=allow` |
| Coordinateur: lisitra foana | tsy misy tetikasa ao amin'ny `strict` | mametraka tetikasa |
| 422 `MASKED_VALUE_REJECTED` | nitahiry fiopaka misy sanda saronana | avereno vakiana amin'ny andraikitra mahazo |
| `compare_live.py`: 401 | lany ny jeton (24 ora) na diso ny clé | havaozina |
| Tsy misy pli ampiasaina | vitsy loatra ny parcours na ny tetikasa | fenoy ny toetra |
Diary: pejy "Diarin'ny fanaraha-maso", hetsika `PROTECTED_DATA_READ …`. Hanafoana avy hatrany: `DATA_PROTECTION_MODE=off` na `--revert`.
