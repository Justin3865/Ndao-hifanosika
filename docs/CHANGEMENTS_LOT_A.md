# Lot A — fanampiana fotsiny (tsy misy route na tabilao nesorina)

## 1. ML — /predict-dropout (LOT 4.4)
- ml/dropout.py (vaovao): régression logistique + arbre de décision vs baseline à règles; validation croisée;
  fetra 30 ligne / 5 isaky ny kilasy; fanapahan-kevitra "PR-AUC > baseline + sigma ET rappel tsy mihena"; tahiry: version, daty, métriques, hash data.
- ml/main.py: miampy POST /v1/train/dropout, POST /predict-dropout, GET /v1/dropout/report. /train, /predict-zones, /report, /health: TSY niova.
- ml/Dockerfile: COPY dropout.py + compare_live.py (raha tsy izany dia ho tapaka ny import ao amin y container).
- Fitondran-tena: raha tsy "retenu" ny modely, /predict-dropout mamaly 503 ka mijanona amin y règles ny backend
  (ny 404 ihany no mampijanona azy mandritra ny fandehanana; tsy ovaina ny backend).
- Alefaso POST /v1/train/dropout rehefa feno ny label avy amin y coordinateurs (>= 100 parcours clos no mety; latsaka: fampitandremana).

## 2. IA — alias section 9.2 sy scores (LOT 4.7, ampahany amin y 4.3)
- ai/app/scoring.py: score_dropout (port marina an y scoreWithRules TS, voamarina amin y 2000 tranga) ; score_performance (0-100, tendance, points forts, axes).
- ai/app/routes_aliases.py: POST /ai/score/dropout-risk, /ai/score/performance (+ /v1/score/...), /ai/report/summary, /ai/anomaly/detect, GET /ai/health.
- ai/app/main.py: andalana fanampiana (include_router + add_api_route). Ny route efa misy: tsy niova.

## 3. Migrations (Laharana 1 n°1)
- Tsy novaina ny anaran y migration efa misy (hanimba ny base izay efa nampiharina azy).
- npm run migrate:check: mamarina ny tantara (alerta raha misy daty ho avy). npm run migrate:new -- <anarana>: mamorona migration
  misy daty = farany + 1 s, ka tsy hanimba ny filaharana. Aza mampiasa "prisma migrate dev" irery mba hamoronana migration vaovao.

## 4. Fanadiovana
Jereo FAFANA.txt.
