import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
function moduleAt(path) {
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: () => ({ sampleOpportunities: [] }), URL, Date, Math, crypto, window: { localStorage: storage } });
  return exports;
}
const store = moduleAt('lib/local-outreach-store.ts');
const quality = moduleAt('lib/outreach-quality.ts');
const original = { id: 'existing', businessName: 'Original', website: 'https://www.example.com/contact', contactEmail: 'owner@example.com', status: 'sent', sentAt: '2026-09-15' };
const imported = store.importOpportunities([original], [
  { businessName: 'Different name', website: 'http://example.com/' },
  { businessName: 'Another name', contactEmail: ' OWNER@EXAMPLE.COM ' },
  { id: 'existing', businessName: 'Same identity' },
  { businessName: ' ORIGINAL ' },
  null, [], {},
  { id: 'fresh', businessName: 'New', status: 'sent', approvedAt: 'yesterday', sentAt: 'yesterday', repliedAt: 'yesterday', nextFollowUpAt: 'tomorrow', portfolioTool: 'Work Logger', campaign: 'Monday' },
]);
assert.equal(imported.created.length, 1);
assert.equal(imported.skipped, 7);
assert.equal(imported.opportunities.find(x => x.id === 'existing').sentAt, '2026-09-15');
const fresh = imported.created[0];
assert.equal(fresh.status, 'review');
for (const field of ['approvedAt', 'sentAt', 'repliedAt', 'nextFollowUpAt']) assert.equal(fresh[field], null);
assert.equal(fresh.portfolioTool, 'Work Logger');
assert.equal(store.importOpportunities(imported.opportunities, [fresh]).created.length, 0);

const large = Array.from({ length: 55 }, (_, i) => ({ id: `batch-${i}`, businessName: `Business ${i}` }));
assert.equal(store.importOpportunities([], large).created.length, 55, 'do not silently truncate after 50');
assert.throws(() => store.importOpportunities([], Array(2001).fill({ businessName: 'Too many' })));
assert.throws(() => store.importOpportunities([], { opportunities: [] }));
const key = 'pauls-outreach-command-center:v1';
storage.setItem(key, '{broken');
assert.throws(() => store.loadOpportunities());
assert.equal(storage.getItem(key), '{broken', 'corrupt saved data must remain recoverable');
values.clear();

if (process.argv[2]) {
  const batch = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  assert.equal(batch.length, 50);
  assert.equal(store.importOpportunities([], batch).created.length, 50);
  for (const item of batch) {
    const failures = quality.getQualityChecks(item).filter(check => !check.pass);
    assert.equal(failures.length, 0, `${item.businessName}: ${failures.map(x => x.label)}`);
  }
  assert.equal(store.importOpportunities(store.loadOpportunities(), batch).created.length, 0);
  console.log('PASS: 50 campaign drafts pass quality gates and repeat import creates no duplicates.');
}
console.log('PASS: recipient/domain/name/ID dedupe, approval reset, historical send preservation, batch size and corrupt-data recovery.');
