import {call,login,setTok} from './h.mjs';
let pass=0,fail=[];
const t=(name,cond,detail='')=>{ if(cond) pass++; else fail.push(name+(detail?'  -> '+detail:'')); };
const D=r=>JSON.stringify(r.j).slice(0,160);
const rnd=Math.random().toString(36).slice(2,7);
const A=await login('admin@ndao-hifanosika.org','admin'); const adm=A.j.data.accessToken; setTok(adm);

// ---------- AUTH ----------
let r=await login('admin@ndao-hifanosika.org','mauvais'); t('login mauvais mdp = 401',r.s===401,D(r));
r=await login('inconnu@x.org','admin'); t('login email inconnu = 401',r.s===401,D(r));
r=await call('POST','/auth/login',{},''); t('login champs vides = 400',r.s===400,D(r));
r=await call('POST','/auth/login',{email:'admin@ndao-hifanosika.org'},''); t('login sans mdp = 400',r.s===400,D(r));
r=await call('GET','/auth/me',null,''); t('/me sans token = 401',r.s===401,D(r));
r=await call('GET','/auth/me',null,'abc.def.ghi'); t('/me token invalide = 401',r.s===401,D(r));
r=await call('GET','/auth/me',null,adm); t('/me ok = 200',r.s===200,D(r));

const em=`u${rnd}@test.org`;
r=await call('POST','/auth/register',{firstName:'A',lastName:'B',email:em,password:'abc'},''); t('register mdp court = 400',r.s===400,D(r));
r=await call('POST','/auth/register',{firstName:'A',lastName:'B',email:'pasunemail',password:'secret123'},''); t('register email invalide = 400',r.s===400,D(r));
r=await call('POST','/auth/register',{firstName:'Ana',lastName:'Test',email:em,password:'secret123'},''); t('register ok = 201',r.s===201,D(r));
r=await call('POST','/auth/register',{firstName:'Ana',lastName:'Test',email:em,password:'secret123'},''); t('register doublon = 409',r.s===409,D(r));
r=await login(em,'secret123'); t('login PENDING refusé (403)',r.s===403,D(r));
let list=await call('GET','/users?search='+encodeURIComponent(em)); const u=(list.j.users||list.j.data||[]).find?.(x=>x.email===em);
t('utilisateur PENDING visible admin',!!u,D(list)); const uid=u?.id;
r=await call('PATCH',`/users/${uid}/activate`); t('activate = 200',r.s===200,D(r));
r=await login(em,'secret123'); t('login ACTIVE = 200',r.s===200,D(r)); const tokU=r.j?.data?.accessToken, refU=r.j?.data?.refreshToken;
r=await call('POST','/auth/refresh',{refreshToken:refU},''); t('refresh ok',r.s===200,D(r));
r=await call('POST','/auth/refresh',{refreshToken:'xxx'},''); t('refresh invalide = 401',r.s===401,D(r));
r=await call('POST','/auth/logout',{refreshToken:refU},tokU); t('logout = 200',r.s===200,D(r));
r=await call('POST','/auth/refresh',{refreshToken:refU},''); t('refresh après logout = 401',r.s===401,D(r));
r=await call('PATCH',`/users/${uid}/reject`); t('reject d\'un compte ACTIVE refusé (400/409)',[400,409].includes(r.s),D(r));
const em3=`r${rnd}@test.org`; await call('POST','/auth/register',{firstName:'Rej',lastName:'Ect',email:em3,password:'secret123'},'');
const l3=await call('GET','/users?search='+encodeURIComponent(em3)); const rid=(l3.j.users||[]).find(x=>x.email===em3)?.id;
r=await call('PATCH',`/users/${rid}/reject`); t('reject PENDING = 200',r.s===200,D(r));
r=await login(em3,'secret123'); t('login REJECTED refusé (403)',r.s===403,D(r));
r=await call('PATCH',`/users/${rid}/activate`); t('réactiver un REJECTED = 200/400',[200,400,409].includes(r.s),D(r));
r=await call('POST','/auth/forgot-password',{email:'inconnu@x.org'},''); t('forgot inconnu pas d\'énumération (200)',r.s===200,D(r));
r=await call('POST','/auth/forgot-password',{},''); t('forgot sans email = 400',r.s===400,D(r));
r=await call('POST','/auth/reset-password',{token:'bad',password:'newpass123'},''); t('reset token invalide = 400',r.s===400,D(r));

// ---------- USERS ----------
const em2=`c${rnd}@test.org`;
r=await call('POST','/users',{firstName:'Cré',lastName:'Ateur',email:em2,password:'secret123',role:'COORDINATOR',status:'ACTIVE'}); t('users create = 201',r.s===201,D(r)); const cid=r.j?.user?.id??r.j?.data?.id;
r=await call('POST','/users',{firstName:'Cré',lastName:'Ateur',email:em2,password:'secret123',role:'COORDINATOR'}); t('users create doublon = 409',r.s===409,D(r));
r=await call('POST','/users',{firstName:'X'}); t('users create champs manquants = 400',r.s===400,D(r));
r=await call('POST','/users',{firstName:'X',lastName:'Y',email:`z${rnd}@t.org`,password:'secret123',role:'SUPERMAN'}); t('users create rôle invalide = 400',r.s===400,D(r));
r=await call('GET',`/users/${cid}`); t('users get = 200',r.s===200,D(r));
r=await call('GET','/users/999999'); t('users get inconnu = 404',r.s===404,D(r));
r=await call('GET','/users/abc'); t('users get id non numérique = 400/404',[400,404].includes(r.s),D(r));
r=await call('PUT',`/users/${cid}`,{role:'COMMUNICATION'}); t('users changement de rôle = 200',r.s===200,D(r));
r=await call('PUT','/users/999999',{role:'RH'}); t('users update inconnu = 404',r.s===404,D(r));
r=await login(em2,'secret123'); const tokC=r.j?.data?.accessToken; t('login du user créé',r.s===200,D(r));
r=await call('GET','/users',null,tokC); t('RBAC: COMMUNICATION ne liste pas /users (403)',r.s===403,D(r));
r=await call('DELETE',`/users/${cid}`,null,tokC); t('RBAC: COMMUNICATION ne supprime pas (403)',r.s===403,D(r));
r=await call('DELETE',`/users/${A.j.data.user.id}`); t('admin ne peut pas se supprimer lui-même (400)',r.s===400,D(r));
r=await call('PUT',`/users/${A.j.data.user.id}`,{role:'RH'}); t('admin ne peut pas se rétrograder (400)',r.s===400,D(r));
r=await call('PUT',`/users/${A.j.data.user.id}`,{status:'INACTIVE'}); t('admin ne peut pas se désactiver (400)',r.s===400,D(r));
r=await call('GET','/users',null,''); t('/users sans token = 401',r.s===401,D(r));

// ---------- PROFIL ----------
r=await call('GET','/profile',null,tokC); t('profil get',r.s===200,D(r));
r=await call('PUT','/profile',{firstName:'',lastName:''},tokC); t('profil nom vide = 400',r.s===400,D(r));
r=await call('PUT','/profile',{firstName:'Nouveau',lastName:'Nom',phone:'0341234567'},tokC); t('profil update',r.s===200,D(r));
r=await call('PUT','/profile/preferences',{notifyEmail:false,notifySms:false},tokC); t('préférences',r.s===200,D(r));
r=await call('PUT','/profile/password',{currentPassword:'faux',newPassword:'NouveauMotDePasse123'},tokC); t('mdp actuel faux = 400/401/403',[400,401,403].includes(r.s),D(r));
r=await call('PUT','/profile/password',{currentPassword:'secret123',newPassword:'court'},tokC); t('nouveau mdp trop court = 400',r.s===400,D(r));
r=await call('PUT','/profile/password',{currentPassword:'secret123',newPassword:'NouveauMotDePasse123'},tokC); t('changement mdp ok',r.s===200,D(r));
r=await login(em2,'NouveauMotDePasse123'); t('login avec nouveau mdp',r.s===200,D(r));
r=await call('PUT','/profile/avatar',{avatar:'pas-une-image'},tokC); t('avatar invalide = 400',r.s===400,D(r));

// ---------- DEPARTEMENTS ----------
const code='D'+rnd.toUpperCase();
r=await call('POST','/departements',{name:'Dept '+rnd,code}); t('dept create = 201',r.s===201,D(r)); const did=r.j?.department?.id;
r=await call('POST','/departements',{name:'Autre '+rnd,code}); t('dept doublon code = 409',r.s===409,D(r));
r=await call('GET',`/departements/${did}`); t('dept get',r.s===200,D(r));
r=await call('GET','/departements/999999'); t('dept get inconnu = 404',r.s===404,D(r));
r=await call('PUT',`/departements/${did}`,{name:'Renommé '+rnd,code}); t('dept update',r.s===200,D(r));
r=await call('PUT','/departements/999999',{name:'x',code:'x'}); t('dept update inconnu = 404',r.s===404,D(r));
r=await call('DELETE',`/departements/${did}`,null,tokC); t('dept delete par COMMUNICATION (403)',r.s===403,D(r));
r=await call('DELETE','/departements/999999'); t('dept delete inconnu = 404',r.s===404,D(r));
r=await call('DELETE',`/departements/${did}`); t('dept delete',r.s===200||r.s===204,D(r));

r=await call('DELETE',`/users/${cid}`); t('users delete = 200',r.s===200||r.s===204,D(r));
r=await call('GET',`/users/${cid}`); t('users get supprimé = 404',r.s===404,D(r));
console.log(`PASS ${pass}  FAIL ${fail.length}`); fail.forEach(f=>console.log(' ✗',f));
