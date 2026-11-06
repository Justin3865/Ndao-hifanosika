# i18n-audit.py : liste les textes français de l'interface qui n'ont pas encore de traduction malgache.
# Usage (depuis n'importe quel dossier) :
#   py C:\ndao-hifanosika\docs\outils\i18n-audit.py
#   py C:\ndao-hifanosika\docs\outils\i18n-audit.py C:\chemin\du\front\src     (si la recherche automatique échoue)
# Résultat : i18n-manque.json, écrit à côté de ce script.
import re,os,sys,json

def find_front_src():
    if len(sys.argv) > 1:
        return os.path.abspath(sys.argv[1])
    roots = [os.getcwd(), os.path.dirname(os.path.abspath(__file__))]
    for r in roots:
        cur = r
        for _ in range(5):                      # remonte jusqu'à 5 niveaux
            if os.path.isfile(os.path.join(cur, 'lib', 'i18n', 'phrases.mg.ts')): return cur
            cur = os.path.dirname(cur)
    for r in roots:                              # descend dans les sous-dossiers
        top = os.path.abspath(os.path.join(r, '..', '..')) if r == roots[1] else r
        for d, dirs, files in os.walk(top):
            dirs[:] = [x for x in dirs if x not in ('node_modules', '.next', '.git', 'dist')]
            if 'phrases.mg.ts' in files and d.replace('\\', '/').endswith('lib/i18n'):
                return os.path.dirname(os.path.dirname(d))
    sys.exit("phrases.mg.ts introuvable. Donnez le dossier src du front en argument.")

FRONT = find_front_src()
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'i18n-manque.json')
os.chdir(FRONT)
print('Front :', FRONT)
# load phrases
txt=open('lib/i18n/phrases.mg.ts',encoding='utf-8').read()
pairs=re.findall(r'^\s*\["((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\],?\s*$',txt,re.M)
def norm(s): return re.sub(r'\s+',' ',s.replace('\u00a0',' ').replace('’',"'").replace('…','...').replace('&apos;',"'").replace('&amp;','&')).strip()
known={norm(bytes(k,'utf-8').decode('unicode_escape').encode('latin1').decode('utf-8') if '\\' in k else k) for k,v in pairs}
dic=open('lib/i18n/dictionaries.ts',encoding='utf-8').read()
FR=re.compile(r"[A-Za-zÀ-ÿ]")
def cands(src):
    out=set()
    # JSX text
    for m in re.finditer(r'>([^<>{}]*[A-Za-zÀ-ÿ][^<>{}]*)<',src):
        out.add(m.group(1))
    # attributes
    for m in re.finditer(r'\b(?:placeholder|title|aria-label|alt|label)=\"([^\"]+)\"',src): out.add(m.group(1))
    # string literals w/ space or accent starting with uppercase
    for m in re.finditer(r'(?<![\w.])(?:"([^"\n]{3,140})"|\'([^\'\n]{3,140})\')',src):
        t=m.group(1) or m.group(2)
        if re.match(r'^[A-ZÀ-Ý«—]',t) and (' ' in t or re.search(r'[éèêàçôûî]',t)) and not re.search(r'[{}=;<>/\\]|^https?|className',t): out.add(t)
    return out
res={}
for root in ['app','components']:
  for d,_,fs in os.walk(root):
    for f in fs:
      if f.endswith('.tsx'):
        p=os.path.join(d,f); src=open(p,encoding='utf-8',errors='ignore').read()
        miss=[]
        for c in cands(src):
            c2=norm(c)
            if not c2 or len(c2)<2 or c2 in known: continue
            if not re.search(r'[a-zà-ÿ]{3}',c2,re.I): continue
            if re.fullmatch(r'[A-Za-z0-9_\-.:/ ]+',c2) and not re.search(r'\b(le|la|les|de|des|du|un|une|et|ou|pour|sur|par|ce|cette|aucun|votre|vos)\b|[A-Z][a-zé]+ [a-zé]+',c2): continue
            miss.append(c2)
        if miss: res[p]=sorted(miss)
tot=sum(len(v) for v in res.values())
print('known',len(known),'files with missing',len(res),'missing total',tot)
json.dump(res,open(OUT,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print('Résultat écrit dans', OUT)
for p in ['app/internships/documents/page.tsx','components/layout/Sidebar.tsx','components/layout/Header.tsx','app/exports/page.tsx','app/consentements/page.tsx','app/presences/page.tsx','app/objectifs/page.tsx','app/dashboard/page.tsx']:
    print(p,len(res.get(p,[])))