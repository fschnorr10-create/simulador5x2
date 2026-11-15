import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import messages from '../src/i18n/messages.ts';
import { defaultEmploymentSettings, payrollCost, contractNames, taxNames } from '../src/payroll.ts';

test('employment UI labels, validation copy and payroll lines are translated', () => {
  const check = (value: string) => assert.ok(Object.hasOwn(messages, value.trim()), `Missing translation: ${value}`);
  for (const file of ['src/components/EmploymentFields.tsx', 'src/components/EmploymentResults.tsx', 'src/components/ContractComparison.tsx', 'src/components/SimpleContractSimulator.tsx', 'src/components/PeriodControls.tsx', 'src/components/JourneyResults.tsx', 'src/components/CoverageMap.tsx', 'src/components/OperatingHours.tsx', 'src/components/WorkScheduleEditor.tsx', 'src/components/ContractWizard.tsx']) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const arg = node.expression.text === 't' ? node.arguments[0] : node.expression.text === 'numeric' ? node.arguments[1] : ['number', 'rate', 'timeInput'].includes(node.expression.text) ? node.arguments[0] : undefined;
        if (arg && ts.isStringLiteral(arg)) check(arg.text);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const value of [...Object.values(contractNames), ...Object.values(taxNames)]) check(value);
  for (const mode of ['monthly', 'intermittent', 'term', 'proportional'] as const) {
    for (const line of payrollCost(1800, 1, defaultEmploymentSettings(), mode).lines) check(line.label);
  }
});
