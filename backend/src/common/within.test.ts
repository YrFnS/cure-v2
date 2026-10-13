import assert from 'node:assert/strict';
import { test } from 'node:test';
import { within } from './within';

const later = <T>(ms: number, value: T) => new Promise<T>(resolve => setTimeout(resolve, ms, value));

test('within: fast result comes back', async () => {
  assert.equal(await within(later(5, 'card'), 100), 'card');
});

test('within: slow result gives undefined', async () => {
  assert.equal(await within(later(100, 'card'), 5), undefined);
});

test('within: fast failure is thrown', async () => {
  await assert.rejects(within(Promise.reject(new Error('unreadable')), 100), /unreadable/);
});
