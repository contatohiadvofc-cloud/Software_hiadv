// Arquivo de calendário (iCalendar, RFC 5545) para a agenda do Google/celular assinar por link.
// A função "agenda" do servidor usa uma cópia deste código (supabase/funcao-agenda.ts).
export type ItemAgenda = { uid: string; titulo: string; dia: string | null; quando: string | null; local: string | null }

export function escaparIcs(t: string): string {
  return t.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')
}

/** Quebra linhas acima de 75 bytes, como manda a norma (continuação começa com espaço). */
export function dobrarLinha(l: string): string {
  const enc = new TextEncoder()
  if (enc.encode(l).length <= 75) return l
  const partes: string[] = []
  let atual = ''
  for (const ch of l) {
    const limite = partes.length ? 74 : 75
    if (enc.encode(atual + ch).length > limite) { partes.push(atual); atual = ch } else atual += ch
  }
  partes.push(atual)
  return partes.join('\r\n ')
}

const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function montarIcs(itens: ItemAgenda[], nome: string, agora = new Date()): string {
  const l = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//HiAdv//Agenda//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escaparIcs(nome)}`, 'X-WR-TIMEZONE:America/Sao_Paulo', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H']
  for (const i of itens) {
    const ev = ['BEGIN:VEVENT', `UID:${i.uid}@hiadv.com.br`, `DTSTAMP:${utc(agora)}`, `SUMMARY:${escaparIcs(i.titulo)}`]
    if (i.quando) {
      const ini = new Date(i.quando)
      if (Number.isNaN(ini.getTime())) continue
      ev.push(`DTSTART:${utc(ini)}`, `DTEND:${utc(new Date(ini.getTime() + 3600e3))}`)
    } else if (i.dia && /^\d{4}-\d{2}-\d{2}$/.test(i.dia)) {
      const d = i.dia.replace(/-/g, '')
      const fim = new Date(`${i.dia}T12:00:00Z`); fim.setUTCDate(fim.getUTCDate() + 1)
      ev.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${fim.toISOString().slice(0, 10).replace(/-/g, '')}`)
    } else continue
    if (i.local) ev.push(`LOCATION:${escaparIcs(i.local)}`)
    ev.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', i.quando ? 'TRIGGER:-PT2H' : 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT')
    l.push(...ev)
  }
  l.push('END:VCALENDAR')
  return l.map(dobrarLinha).join('\r\n') + '\r\n'
}
