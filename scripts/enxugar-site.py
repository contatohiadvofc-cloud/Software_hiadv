import re, sys
s = open(sys.argv[1]).read()
def tira(id_attr):
    global s
    m = re.search(r'\n\s*<section[^>]*aria-labelledby="%s"' % id_attr, s)
    if not m: print('nao achou', id_attr); return
    i = m.start(); j = s.index('</section>', i) + len('</section>')
    s = s[:i] + s[j:]
for t in ['t-dores', 't-recursos', 't-dif', 't-sara', 't-passos', 't-instalar']: tira(t)
# sigilo em uma frase
s = re.sub(r'<div class="sv-prev-texto">.*?</div>', '<div class="sv-prev-texto"><p>Cada escritório só vê os próprios dados, o acesso é por pessoa e tudo fica registrado. Parecer e decisão continuam com o advogado, e nada é enviado ao cliente sem alguém da equipe conferir.</p></div>', s, count=1, flags=re.S)
# dúvidas: só as 4 primeiras perguntas essenciais
blocos = re.findall(r'\s*<details>.*?</details>', s, flags=re.S)
manter = [b for b in blocos if any(k in b for k in ['área do meu escritório', 'teste grátis', 'Play Store', 'escrever as peças'])]
for b in blocos:
    if b not in manter: s = s.replace(b, '', 1)
s = s.replace('Veja o passo a passo em “Instale no seu aparelho”.', 'Abra hiadv.com.br no celular e toque em “Instalar”.')
# menu: tira âncoras de seções removidas
for a in ['#dia-a-dia', '#recursos', '#sara', '#instalar']:
    s = re.sub(r'\s*<a href="%s">[^<]*</a>' % re.escape(a), '', s)
open(sys.argv[2], 'w').write(s)
