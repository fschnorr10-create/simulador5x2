import type { Scenario } from './types.ts';

export const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const shortDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function defaultScenario(preset: 'rural' | 'cnc' = 'rural'): Scenario {
  const rural = preset === 'rural';
  return {
    version: 1, name: rural ? 'Minha operação rural' : 'Minha empresa',
    sector: rural ? 'rural' : 'comercio', state: 'PE', city: '', scale: '6x1',
    employees: rural ? 12 : 5, currentHours: 44, salary: rural ? 1800 : 2200,
    charges: 40, extraRate: 50, dsrRate: 20, monthlyWeeks: 5,
    interval: 60, collective: 'nao-sei', collectiveRef: '',
    insalubrious: false, publicContract: false,
    days: dayNames.map((name, day) => ({ name, bands: [{
      id: `day-${day}-0`, open: '08:00', close: day === 5 ? '14:00' : '18:00',
      people: day === 6 ? 0 : rural ? (day === 5 ? 6 : 9) : (day === 5 ? 2 : 3),
    }] })),
  };
}
