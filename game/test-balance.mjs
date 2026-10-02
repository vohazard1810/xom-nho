import assert from 'node:assert/strict';
import { simulate } from './balance-sim.mjs';

const conservative = simulate('conservative');
const expand = simulate('expand');
const high = simulate('high_price');
const recovery = simulate('recover_price');

for (const rows of [conservative, expand, high, recovery]) {
  assert.equal(rows.length, 21);
  assert.ok(rows.every(r => r.cash >= 0 && r.rating >= 1 && r.rating <= 5));
}
assert.equal(conservative[0].cash, 127000, 'Approved Day 1 baseline stays intact');
assert.ok(expand.at(-1).cash > conservative.at(-1).cash, 'Capacity investments create opportunity');
assert.ok(expand.at(-1).rating >= 4, 'Planning and upgrades can build reputation');
assert.ok(high.at(-1).cash < conservative.at(-1).cash, 'Persistent top pricing must carry an economic cost');
assert.ok(high.filter(r => r.profit < 0).length >= 5, 'Top pricing must create some negative-result days');
assert.ok(recovery.at(-1).rating > recovery[6].rating, 'Returning to ordinary prices should recover reputation');
assert.ok(recovery.at(-1).cash > high.at(-1).cash);
console.log('21-day economy probes: conservative, expansion, persistent high price, and recovery PASS');
