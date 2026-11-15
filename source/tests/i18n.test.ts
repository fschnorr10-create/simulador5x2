import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, locales } from '../src/i18n/core.ts';
import messages from '../src/i18n/messages.ts';
import { defaultScenario } from '../src/defaults.ts';
import { calculate } from '../src/engine.ts';

test('both translated catalogs have nonempty content for every supported message', () => {
  for (const [key, values] of Object.entries(messages)) {
    assert.ok(values.en.trim(), `English missing: ${key}`);
    assert.ok(values.es.trim(), `Spanish missing: ${key}`);
    assert.equal(translate(key, 'pt'), key);
  }
  assert.deepEqual(locales, { pt: 'pt-BR', es: 'es', en: 'en' });
});

test('dynamic day controls, validation messages and staffing figures translate', () => {
  assert.equal(translate('Excluir dia Terça', 'en'), 'Remove day Tuesday');
  assert.equal(translate('Sábado faixa 2: pessoas', 'es'), 'Sábado franja 2: personas');
  assert.equal(translate('Adicionar faixa em Quarta', 'en'), 'Add band on Wednesday');
  assert.equal(translate('Dia 2: horários sobrepostos, inclusive após meia-noite.', 'en'), 'Day 2: overlapping times, including after midnight.');
  assert.equal(translate('30h24 por semana ainda precisam de cobertura.', 'es'), '30h24 por semana aún necesitan cobertura.');
  assert.equal(translate('Mostrar os 20 empregados', 'en'), 'Show all 20 employees');
  assert.equal(translate('  Sua operação ', 'en'), '  Your operation ');
});

test('language changes preserve imported scenario data and calculations', () => {
  const scenario = defaultScenario();
  scenario.name = 'Fazenda São José';
  const original = JSON.stringify(scenario);
  const before = calculate(scenario, 42);
  for (const language of ['pt', 'es', 'en'] as const) {
    scenario.days.forEach(day => translate(day.name, language));
    assert.equal(translate(scenario.name, language), scenario.name);
    assert.equal(translate('https://advschnorr.com.br', language), 'https://advschnorr.com.br');
  }
  assert.equal(JSON.stringify(scenario), original);
  const after = calculate(scenario, 42);
  assert.equal(after.gap, before.gap);
  assert.equal(after.partialCost, before.partialCost);
});

import { banners } from '../src/bannerContent.ts';

test('every purpose banner has complete Spanish and English copy', () => {
  for (const { label, slides } of Object.values(banners)) {
    assert.ok(Object.hasOwn(messages, label), `Missing banner label: ${label}`);
    for (const slide of slides) {
      for (const field of ['title', 'subtitle', 'description', 'tipTitle', 'tip', 'action', 'imageAlt'] as const) {
        assert.ok(Object.hasOwn(messages, slide[field]), `Missing translation: ${slide[field]}`);
      }
      assert.ok(slide.imageIndex >= 0 && slide.imageIndex < (slide.image === 'sector' ? 4 : 3));
    }
  }
});
