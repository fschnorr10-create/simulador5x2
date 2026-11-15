import messages from './messages.ts';

export type Language = 'pt' | 'es' | 'en';
export const locales: Record<Language, string> = { pt: 'pt-BR', es: 'es', en: 'en' };
export const languageNames: Record<Language, string> = { pt: 'Português', es: 'Español', en: 'English' };
type Translations = Record<string, { es: string; en: string }>;
const catalog: Translations = messages;

const patterns: Array<[RegExp, string, string]> = [
  [/^(.+) por semana ainda precisam de cobertura\.$/, '$1 por semana aún necesitan cobertura.', '$1 per week still need coverage.'],
  [/^(\d+) contrato\(s\) de (.+)\/sem$/, '$1 contrato(s) de $2/sem', '$1 contract(s) of $2/wk'],
  [/^Mostrar os (\d+) empregados$/, 'Mostrar los $1 empleados', 'Show all $1 employees'],
  [/^(.+)min pausa$/, '$1min de pausa', '$1min break'],
  [/^(.+) faixa (\d+): abre$/, '$1 franja $2: abre', '$1 band $2: opens'],
  [/^(.+) faixa (\d+): fecha$/, '$1 franja $2: cierra', '$1 band $2: closes'],
  [/^(.+) faixa (\d+): pessoas$/, '$1 franja $2: personas', '$1 band $2: people'],
  [/^Adicionar faixa de horário em (.+)$/, 'Añadir franja horaria en $1', 'Add time band on $1'],
  [/^Adicionar faixa em (.+)$/, 'Añadir franja en $1', 'Add band on $1'],
  [/^Excluir (.+) e suas faixas de horário$/, 'Excluir $1 y sus franjas horarias', 'Remove $1 and its time bands'],
  [/^Excluir dia (.+)$/, 'Excluir día $1', 'Remove day $1'],
  [/^Remover faixa (\d+) de (.+)$/, 'Eliminar franja $1 de $2', 'Remove band $1 on $2'],
  [/^Não foi possível importar: (.+)$/, 'No se pudo importar: $1', 'Unable to import: $1'],
  [/^Opção inválida: (.+)\.$/, 'Opción no válida: $1.', 'Invalid option: $1.'],
  [/^Texto inválido: (.+)\.$/, 'Texto no válido: $1.', 'Invalid text: $1.'],
  [/^Dia (\d+): máximo de seis faixas\.$/, 'Día $1: máximo de seis franjas.', 'Day $1: maximum of six bands.'],
  [/^Dia (\d+): faixa inválida \(0 a 500 pessoas\)\.$/, 'Día $1: franja no válida (0 a 500 personas).', 'Day $1: invalid band (0 to 500 people).'],
  [/^Dia (\d+): horários sobrepostos, inclusive após meia-noite\.$/, 'Día $1: horarios superpuestos, incluso después de medianoche.', 'Day $1: overlapping times, including after midnight.'],
  [/^Dia (\d+): horário inválido\.$/, 'Día $1: horario no válido.', 'Day $1: invalid time.'],
  [/^(.+) (\d+)h: (.+) de (.+)-pessoa cobertas \((.+)%\)$/, '$1 $2h: $3 de $4 horas-persona cubiertas ($5%)', '$1 $2h: $3 of $4 person-hours covered ($5%)'],
];

/** Text lookup never changes scenario values, IDs, legal source URLs or saved JSON. */
export function translate(text: string, language: Language): string {
  if (language === 'pt' || !text.trim()) return text;
  const key = text.trim();
  const exact = catalog[key]?.[language];
  let result = exact;
  if (result === undefined) {
    for (const [pattern, es, en] of patterns) {
      if (pattern.test(key)) {
        result = key.replace(pattern, language === 'es' ? es : en);
        // Dynamic labels contain calendar day names, which are presentation-only.
        for (const day of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']) {
          result = result.replace(new RegExp(`\\b${day}(?=\\s|$|,)`, 'gu'), catalog[day]?.[language] ?? day);
        }
        break;
      }
    }
  }
  return result === undefined ? text : text.slice(0, text.indexOf(key)) + result + text.slice(text.indexOf(key) + key.length);
}
