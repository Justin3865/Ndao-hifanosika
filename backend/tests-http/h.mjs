export const B='http://localhost:4000/api';
export let tok='';
export const setTok=t=>tok=t;
export async function call(method,path,body,token,extra={}){
  if(arguments.length<4) token=tok;
  const r=await fetch(B+path,{method,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...extra},body:body?JSON.stringify(body):undefined});
  let j=null; try{j=await r.json()}catch{}
  return {s:r.status,j};
}
export const login=async(email,password)=>{const r=await call('POST','/auth/login',{email,password},'');return r;};
