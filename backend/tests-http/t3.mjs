import {call,login,setTok} from './h.mjs';
let pass=0,fail=[]; const t=(n,c,d='')=>{ if(c) pass++; else fail.push(n+(d?'  -> '+d:'')); };
const D=r=>r.s+' '+JSON.stringify(r.j).slice(0,200); const rnd=Math.random().toString(36).slice(2,6).toUpperCase();
const A=await login('admin@ndao-hifanosika.org','admin'); const adm=A.j.data.accessToken; setTok(adm);
const id=r=>r.j?.data?.id??r.j?.evaluation?.id??r.j?.internship?.id??r.j?.project?.id??r.j?.user?.id??r.j?.department?.id;
const mkUser=async(role)=>{const email=`${role.toLowerCase()}${rnd}${Math.random().toString(36).slice(2,4)}@t.org`; const r=await call('POST','/users',{firstName:role,lastName:'T',email,password:'secret123',role,status:'ACTIVE'}); const l=await login(email,'secret123'); return {id:r.j?.user?.id,tok:l.j?.data?.accessToken,email};};
const stagiaire=await mkUser('STAGIAIRE_M2'), tuteur=await mkUser('TUTEUR_M2'), rh=await mkUser('RH'), coord=await mkUser('COORDINATOR'), daf=await mkUser('DAF');
let r=await call('POST','/projects',{code:'E'+rnd,name:'ProjE'+rnd,status:'ACTIVE',startDate:'2026-01-01',endDate:'2026-12-31'}); const pid=id(r);

// ---- EVALUATIONS
const ev={projectId:pid,title:'Eval '+rnd,description:'d',score:15,status:'DRAFT'};
r=await call('POST','/evaluations',ev); t('évaluation create (DRAFT)',r.s===201,D(r)); const eid=id(r);
r=await call('POST','/evaluations',{...ev,title:''}); t('évaluation sans titre = 400',r.s===400,D(r));
r=await call('POST','/evaluations',{...ev,projectId:999999}); t('évaluation projet inexistant = 404',r.s===404,D(r));
r=await call('POST','/evaluations',{...ev,status:'BIDON'}); t('évaluation statut invalide = 400',r.s===400,D(r));
r=await call('POST','/evaluations',{...ev,score:'abc'}); t('évaluation score non numérique = 400',r.s===400,D(r));
r=await call('POST','/evaluations',{...ev,score:-3}); t('évaluation score négatif = 400',r.s===400,D(r));
r=await call('POST','/evaluations',{...ev,score:500}); t('évaluation score > 100 = 400',r.s===400,D(r));
r=await call('PUT',`/evaluations/${eid}`,{...ev,status:'SUBMITTED'}); t('évaluation soumission',r.s===200,D(r));
r=await call('PUT',`/evaluations/${eid}`,{...ev,status:'VALIDATED'},tuteur.tok); t('RBAC: tuteur ne valide pas / ou autorisé (200/403)',[200,403].includes(r.s),D(r));
r=await call('PUT',`/evaluations/${eid}`,{...ev,status:'VALIDATED'}); t('évaluation validation admin',r.s===200,D(r));
r=await call('GET',`/evaluations/${eid}`); t('évaluation get',r.s===200,D(r));
r=await call('GET','/evaluations/999999'); t('évaluation inconnue = 404',r.s===404,D(r));
r=await call('POST','/evaluations',ev,daf.tok); t('RBAC: DAF ne crée pas d\'évaluation (403)',r.s===403,D(r));
r=await call('GET','/evaluations',null,stagiaire.tok); t('stagiaire liste évaluations (200, périmètre restreint)',r.s===200,D(r));

// ---- STAGES
const it={studentId:stagiaire.id,supervisorId:tuteur.id,projectId:pid,title:'Stage '+rnd,institution:'ENI',startDate:'2026-03-01',endDate:'2026-08-01',status:'PENDING'};
r=await call('POST','/internships',it); t('stage create',r.s===201,D(r)); const iid=id(r);
r=await call('POST','/internships',{...it,studentId:undefined}); t('stage sans étudiant = 400',r.s===400,D(r));
r=await call('POST','/internships',{...it,studentId:999999}); t('stage étudiant inexistant = 404',r.s===404,D(r));
r=await call('POST','/internships',{...it,supervisorId:999999}); t('stage tuteur inexistant = 404',r.s===404,D(r));
r=await call('POST','/internships',{...it,startDate:'2026-09-01',endDate:'2026-03-01'}); t('stage fin avant début = 400',r.s===400,D(r));
r=await call('POST','/internships',{...it,status:'XX'}); t('stage statut invalide = 400',r.s===400,D(r));
r=await call('POST','/internships',{...it,startDate:'nimporte'}); t('stage date invalide = 400',r.s===400,D(r));
for(const st of ['IN_PROGRESS','COMPLETED','CANCELLED']){ r=await call('PUT',`/internships/${iid}`,{...it,status:st}); t('stage statut '+st,r.s===200,D(r)); }
r=await call('GET',`/internships/${iid}`,null,stagiaire.tok); t('stagiaire voit son stage',r.s===200,D(r));
r=await call('GET',`/internships/${iid}`,null,(await mkUser('STAGIAIRE_L3')).tok); t('autre stagiaire ne voit pas ce stage (403/404)',[403,404].includes(r.s),D(r));
r=await call('POST','/internships',it,stagiaire.tok); t('RBAC: stagiaire ne crée pas de stage (403)',r.s===403,D(r));
r=await call('GET','/internships/999999'); t('stage inconnu = 404',r.s===404,D(r));

// ---- NOTIFICATIONS
r=await call('POST','/notifications',{userId:stagiaire.id,title:'Hello',message:'Msg',type:'INFO'}); t('notification create',r.s===201,D(r)); const nid=id(r);
r=await call('POST','/notifications',{userId:stagiaire.id}); t('notification champs manquants = 400',r.s===400,D(r));
r=await call('POST','/notifications',{userId:999999,title:'x',message:'y'}); t('notification user inexistant = 404/400/409',[400,404,409].includes(r.s),D(r));
r=await call('POST','/notifications',{userId:stagiaire.id,title:'x',message:'y',type:'ZZZ'}); t('notification type invalide = 400',r.s===400,D(r));
r=await call('GET','/notifications',null,stagiaire.tok); t('notifications du stagiaire (dont celle créée)',r.s===200&&JSON.stringify(r.j).includes('Hello'),D(r));
r=await call('GET','/notifications',null,tuteur.tok); t('notifications isolées par utilisateur',r.s===200&&!JSON.stringify(r.j).includes('"Hello"'),D(r));
r=await call('PATCH',`/notifications/${nid}/read`,null,tuteur.tok); t('marquer lue la notif d\'un autre = 403/404',[403,404].includes(r.s),D(r));
r=await call('DELETE',`/notifications/${nid}`,null,tuteur.tok); t('supprimer la notif d\'un autre = 403/404',[403,404].includes(r.s),D(r));
r=await call('PATCH',`/notifications/${nid}/read`,null,stagiaire.tok); t('marquer lue',r.s===200,D(r));
r=await call('PATCH','/notifications/read-all',null,stagiaire.tok); t('tout marquer lu',r.s===200,D(r));
r=await call('DELETE',`/notifications/${nid}`,null,stagiaire.tok); t('supprimer sa notification',r.s===200||r.s===204,D(r));
r=await call('PATCH','/notifications/999999/read',null,stagiaire.tok); t('notif inconnue = 404',r.s===404,D(r));
r=await call('POST','/notifications',{userId:stagiaire.id,title:'x',message:'y'},stagiaire.tok); t('RBAC: stagiaire ne crée pas de notification (403)',r.s===403,D(r));
// notifications automatiques (stage créé → stagiaire/tuteur notifiés ?)
r=await call('GET','/notifications',null,stagiaire.tok); t('notification automatique à la création de stage',JSON.stringify(r.j).toLowerCase().includes('stage'),D(r));

// ---- MEMBRES
r=await call('GET','/members'); t('membres liste',r.s===200,D(r));
r=await call('GET',`/members/${stagiaire.id}`); t('membre get',r.s===200,D(r));
r=await call('PUT',`/members/${stagiaire.id}`,{phone:'0341111111'},rh.tok); t('membre update par RH',r.s===200,D(r));
r=await call('PUT',`/members/${stagiaire.id}`,{phone:'0341111111'},daf.tok); t('RBAC: DAF ne modifie pas un membre (403)',r.s===403,D(r));
r=await call('PATCH',`/members/${stagiaire.id}/deactivate`,null,rh.tok); t('membre désactivé',r.s===200,D(r));
r=await login(stagiaire.email,'secret123'); t('membre désactivé ne peut plus se connecter (403)',r.s===403,D(r));
r=await call('PATCH','/members/999999/deactivate'); t('membre inconnu = 404',r.s===404,D(r));

// ---- CERTIFICATS
await call('PUT',`/internships/${iid}`,{...it,status:'COMPLETED'});
r=await call('POST','/certificates',{internshipId:iid,holderName:'Stag Iaire',title:'Attestation de stage',type:'INTERNSHIP'}); t('certificat émis',r.s===201,D(r)); const code=r.j?.data?.code; const cid=r.j?.data?.id;
r=await call('POST','/certificates',{holderName:'X',title:'Y'}); t('certificat sans stage = 400',r.s===400,D(r));
r=await call('POST','/certificates',{internshipId:iid}); t('certificat sans titulaire = 400',r.s===400,D(r));
r=await call('POST','/certificates',{internshipId:999999,holderName:'X',title:'Y'}); t('certificat stage inexistant = 400/404',[400,404].includes(r.s),D(r));
r=await call('GET',`/public/certificates/${code}`,null,''); t('vérification publique (sans login)',r.s===200,D(r));
r=await call('GET','/public/certificates/CODE-INCONNU',null,''); t('vérification code inconnu = 404',r.s===404,D(r));
r=await call('POST','/certificates',{internshipId:iid,holderName:'X',title:'Y'},daf.tok); t('RBAC: DAF n\'émet pas (403)',r.s===403,D(r));
r=await call('DELETE',`/certificates/${cid}`,null,coord.tok); t('RBAC: coordinateur ne supprime pas (403)',r.s===403,D(r));
r=await call('DELETE',`/certificates/${cid}`); t('révocation de certificat',r.s===200,D(r));
r=await call('GET',`/public/certificates/${code}`,null,''); t('certificat révoqué visible comme REVOKED',r.j?.status==='REVOKED',D(r));

console.log(`PASS ${pass}  FAIL ${fail.length}`); fail.forEach(f=>console.log(' ✗',f));
