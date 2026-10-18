import {call,login,setTok} from './h.mjs';
let pass=0,fail=[]; const t=(n,c,d='')=>{ if(c) pass++; else fail.push(n+(d?'  -> '+d:'')); };
const D=r=>r.s+' '+JSON.stringify(r.j).slice(0,220); const rnd=Math.random().toString(36).slice(2,6).toUpperCase();
const A=await login('admin@ndao-hifanosika.org','admin'); const adm=A.j.data.accessToken; setTok(adm);
const mk=async(role)=>{const email=`${role.toLowerCase()}${rnd}${Math.random().toString(36).slice(2,4)}@t.org`; const r=await call('POST','/users',{firstName:role,lastName:'T',email,password:'secret123',role,status:'ACTIVE'}); const l=await login(email,'secret123'); return {id:r.j?.user?.id,tok:l.j?.data?.accessToken};};
const daf=await mk('DAF'), coord=await mk('COORDINATOR'), stag=await mk('STAGIAIRE_L3');
let r=await call('POST','/projects',{code:'T'+rnd,name:'ProjT'+rnd,status:'ACTIVE'}); const pid=r.j?.project?.id;
r=await call('POST','/zones',{name:'ZT'+rnd,latitude:-21.45,longitude:47.08,isHeadquarters:true}); const zid=r.j?.data?.id;
const mkB=async(extra)=>{const r=await call('POST','/beneficiaries',{projectId:pid,firstName:'B',lastName:'T',gender:'FEMALE',zoneId:zid,...extra}); return r.j?.data?.id;};
const adult=await mkB({age:30,vulnerable:true,homeLatitude:-21.46,homeLongitude:47.09,homeAltitude:1100,householdSize:7,monthlyIncome:30000,childrenUnder5:3});
const minor=await mkB({age:12});
for(let i=0;i<14;i++) await mkB({age:20+i,vulnerable:i%3===0,homeLatitude:-21.4+i*0.01,homeLongitude:47+i*0.01,homeAltitude:900+i*30,householdSize:2+i%6,monthlyIncome:20000+i*9000,childrenUnder5:i%4});

// ---- TRACKING
r=await call('POST',`/tracking/beneficiaries/${adult}/link`); t('lien de suivi généré',r.s===200&&r.j?.data?.path,D(r)); const path=r.j?.data?.path; const token=path?.split('/').pop();
r=await call('POST','/tracking/beneficiaries/999999/link'); t('lien bénéficiaire inconnu = 404',r.s===404,D(r));
r=await call('POST',`/tracking/beneficiaries/${adult}/link`,null,daf.tok); t('RBAC: DAF ne génère pas de lien (403)',r.s===403,D(r));
r=await call('GET',`/public/tracking/${token}`,null,''); t('page publique du lien (sans login)',r.s===200,D(r));
r=await call('GET','/public/tracking/lienbidon',null,''); t('lien invalide = 404',r.s===404,D(r));
r=await call('POST',`/public/tracking/${token}/location`,{latitude:-21.4,longitude:47.1},''); t('position avant consentement refusée (403/400)',[400,403].includes(r.s),D(r));
r=await call('POST',`/public/tracking/${token}/consent`,{},''); t('consentement adulte',r.s===200,D(r));
r=await call('POST',`/public/tracking/${token}/location`,{latitude:-21.4,longitude:47.1,accuracy:12},''); t('position après consentement',r.s===200,D(r));
r=await call('POST',`/public/tracking/${token}/location`,{latitude:999,longitude:47.1},''); t('position hors limites = 400',r.s===400,D(r));
r=await call('POST',`/public/tracking/${token}/location`,{latitude:'abc',longitude:47.1},''); t('position non numérique = 400',r.s===400,D(r));
r=await call('GET','/tracking/targets'); t('carte: targets (bénéficiaire suivi visible)',r.s===200&&JSON.stringify(r.j).includes(`"id":${adult}`),D(r));
r=await call('GET','/tracking/zones'); t('carte: zones',r.s===200,D(r));
r=await call('GET','/tracking/staff'); t('carte: staff',r.s===200,D(r));
r=await call('GET','/tracking/targets',null,stag.tok); t('RBAC: stagiaire ne voit pas la carte (403)',r.s===403,D(r));
r=await call('POST',`/public/tracking/${token}/stop`,{},''); t('arrêt du suivi par le bénéficiaire',r.s===200,D(r));
r=await call('POST',`/public/tracking/${token}/location`,{latitude:-21.4,longitude:47.1},''); t('position après arrêt refusée',[400,403].includes(r.s),D(r));
// mineur
r=await call('POST',`/tracking/beneficiaries/${minor}/link`); const tm=r.j?.data?.path?.split('/').pop();
r=await call('POST',`/public/tracking/${tm}/consent`,{},''); t('mineur sans accord parent = 400',r.s===400,D(r));
r=await call('POST',`/public/tracking/${tm}/consent`,{guardianConfirmed:'oui'},''); t('mineur accord non booléen = 400',r.s===400,D(r));
r=await call('POST',`/public/tracking/${tm}/consent`,{guardianConfirmed:true},''); t('mineur avec accord parent',r.s===200,D(r));
// ancien lien invalidé à la régénération + révocation
r=await call('POST',`/tracking/beneficiaries/${adult}/link`); const token2=r.j?.data?.path?.split('/').pop();
r=await call('GET',`/public/tracking/${token}`,null,''); t('ancien lien invalidé après régénération (404)',r.s===404,D(r));
r=await call('DELETE',`/tracking/beneficiaries/${minor}`); t('révocation du suivi',r.s===200,D(r));
r=await call('GET',`/public/tracking/${tm}`,null,''); t('lien révoqué = 404',r.s===404,D(r));
r=await call('GET','/public/organization',null,''); t('organisation publique',r.s===200,D(r));

// ---- GPS PERSONNEL (agent)
r=await call('POST','/vulnerability/my-location',{latitude:-21.44,longitude:47.07,altitude:1100},coord.tok); t('agent partage sa position',r.s===200,D(r));
r=await call('POST','/vulnerability/my-location',{latitude:'x',longitude:1},coord.tok); t('position agent invalide = 400',r.s===400,D(r));
r=await call('POST','/vulnerability/my-location',{latitude:-21,longitude:47},stag.tok); t('stagiaire ne partage pas (403)',r.s===403,D(r));
r=await call('GET','/tracking/staff'); t('agent visible sur la carte staff',JSON.stringify(r.j).includes('COORDINATOR'),D(r));
r=await call('GET','/vulnerability/households'); t('households: ménages vulnérables + agent proche',r.s===200&&(r.j?.data?.households||[]).length>0,D(r));
t('households: nearestWorker calculé',(r.j?.data?.households||[]).some(h=>h.nearestWorker),'');
r=await call('GET','/vulnerability/zones'); t('vulnerability/zones',r.s===200&&Array.isArray(r.j?.data)&&r.j.data.length>0,D(r));
t('zone: taux/score numériques',r.j?.data?.every(z=>Number.isFinite(z.finalScore)&&Number.isFinite(z.rate)),'');
r=await call('GET','/vulnerability/zones',null,daf.tok); t('RBAC: DAF refusé sur vulnerability (403)',r.s===403,D(r));
r=await call('DELETE','/vulnerability/my-location',null,coord.tok); t('agent arrête le partage',r.s===200,D(r));

// ---- DATASET ML
const key={'x-service-key':'service-key-test-1234567890'};
r=await call('GET','/service/dataset',null,'',key); t('dataset ML avec clé',r.s===200&&r.j?.data?.length>=16,D(r));
t('dataset: features numériques (distanceKm calculée vs siège)',r.j?.data?.some(x=>Number.isFinite(x.distanceKm)),'');
r=await call('GET','/service/dataset',null,'',{'x-service-key':'mauvaise'}); t('dataset mauvaise clé = 401',r.s===401,D(r));
r=await call('GET','/service/dataset',null,adm); t('dataset avec JWT admin mais sans clé = 401',r.s===401,D(r));

// ---- IA
r=await call('GET','/ai/summary'); t('ai/summary',r.s===200,D(r));
r=await call('GET','/ai/performance'); t('ai/performance',r.s===200,D(r));
r=await call('GET','/ai/anomalies'); t('ai/anomalies',r.s===200,D(r));
r=await call('GET','/ai/dropout-risk'); t('ai/dropout-risk liste',r.s===200,D(r));
r=await call('GET','/ai/models'); t('ai/models',r.s===200,D(r));
r=await call('GET','/ai/households'); t('ai/households',r.s===200,D(r));
t('households scorés (score + méthode)',(r.j?.data?.households||r.j?.data||[]).length>0,D(r));
r=await call('POST','/ai/train'); t('ai/train',[200,201,400,409].includes(r.s),D(r));
r=await call('GET','/ai/households'); t('households après entraînement',r.s===200,'');
r=await call('POST','/ai/chat',{message:'Quelles sont les zones les plus vulnérables ?'}); t('chat répond (reply)',r.s===200&&!!r.j?.data?.reply,D(r));
t('chat renvoie zoneIds',Array.isArray(r.j?.data?.zoneIds),D(r));
r=await call('POST','/ai/chat',{message:'   '}); t('chat message vide = 400',r.s===400,D(r));
r=await call('POST','/ai/chat',{}); t('chat sans message = 400',r.s===400,D(r));
r=await call('POST','/ai/chat',{message:'x'.repeat(5000)}); t('chat message énorme = 200/400/413',[200,400,413].includes(r.s),D(r));
r=await call('GET','/ai/summary',null,daf.tok); t('RBAC: DAF refusé sur ai/summary (403)',r.s===403,D(r));
r=await call('POST','/ai/train',null,coord.tok); t('RBAC: coordinateur ne lance pas train (403)',r.s===403,D(r));
r=await call('POST','/ai/score/dropout-risk',{}); t('score dropout sans données = 400',r.s===400,D(r));
r=await call('POST','/ai/score/dropout-risk',{attendanceRate:0.8,evaluationAverage:14}); t('score dropout (service IA ou repli, pas de 500)',[200,502,503].includes(r.s),D(r));

// ---- RAPPORTS / AUDIT / GRILLES
r=await call('GET','/reports/dashboard'); t('reports/dashboard',r.s===200,D(r));
r=await call('GET',`/reports/projects/${pid}`); t('reports/projet',r.s===200,D(r));
r=await call('GET','/reports/projects/999999'); t('reports/projet inconnu = 404',r.s===404,D(r));
r=await call('GET','/reports/projects/abc'); t('reports/projet id invalide = 400/404',[400,404].includes(r.s),D(r));
r=await call('GET','/reports/evaluations'); t('reports/evaluations',r.s===200,D(r));
r=await call('GET','/reports/beneficiaries'); t('reports/beneficiaries',r.s===200,D(r));
r=await call('GET','/reports/dashboard',null,stag.tok); t('RBAC: stagiaire sur dashboard (200 restreint ou 403)',[200,403].includes(r.s),D(r));
r=await call('GET','/audit'); t('audit liste (ADMIN)',r.s===200,D(r));
t('audit contient des actions',JSON.stringify(r.j).length>60,D(r));
r=await call('GET','/audit',null,daf.tok); t('RBAC: DAF refusé sur audit (403)',r.s===403,D(r));
r=await call('POST','/evaluation-grids',{name:'Grille '+rnd,description:'d',criteriaText:'Assiduité | 2\nQualité | 3'}); t('grille create',r.s===201,D(r)); const gid=r.j?.data?.id;
r=await call('POST','/evaluation-grids',{description:'sans nom'}); t('grille sans nom = 400',r.s===400,D(r));
r=await call('GET',`/evaluation-grids/${gid}`); t('grille get (criteriaText)',r.s===200&&r.j?.data?.criteriaText?.includes('Assiduité'),D(r));
r=await call('PUT',`/evaluation-grids/${gid}`,{name:'Grille2 '+rnd,criteriaText:'A | 1'}); t('grille update',r.s===200,D(r));
r=await call('GET','/evaluation-grids/999999'); t('grille inconnue = 404',r.s===404,D(r));
r=await call('POST','/evaluation-campaigns',{name:'Camp '+rnd,startDate:'2026-01-01',endDate:'2026-02-01',gridId:gid}); t('campagne create',r.s===201,D(r)); const cpid=r.j?.data?.id;
r=await call('POST','/evaluation-campaigns',{name:'Camp2',startDate:'2026-03-01',endDate:'2026-02-01'}); t('campagne fin avant début = 400',r.s===400,D(r));
r=await call('DELETE',`/evaluation-campaigns/${cpid}`,null,coord.tok); t('RBAC: coordinateur ne supprime pas campagne (403)',r.s===403,D(r));
r=await call('DELETE',`/evaluation-grids/${gid}`); t('grille delete',r.s===200||r.s===204,D(r));

console.log(`PASS ${pass}  FAIL ${fail.length}`); fail.forEach(f=>console.log(' ✗',f));
