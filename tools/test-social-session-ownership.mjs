import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Normal session boundaries, using independent synthetic snapshots and a local client.
for (const [moduleName, globalName, writer] of [
  ['supabase-friends', 'BrainiFriends', 'syncCloudFriends'],
  ['supabase-groups', 'BrainiGroups', 'syncCloudGroups']
]) {
  let scope = {userId: 'one'};
  let snapshot;
  const context = vm.createContext({
    console, CustomEvent: class {}, dispatchEvent() {},
    BrainiBackendAuth: {
      isConfigured: () => true,
      getSession: async () => scope.userId ? {user: {id: scope.userId}} : null,
      currentScope: () => scope,
      isCurrentPlayer: value => Boolean(scope.userId) && scope === value,
      getClient: () => ({rpc: async () => ({data: {generated_at: scope.userId}})})
    },
    BrainiData: {api: {[writer]: async value => { snapshot = value; }}}
  });
  context.window = context;
  const file = new URL('../assets/js/' + moduleName + '.js', import.meta.url);
  vm.runInContext(await readFile(file, 'utf8'), context);
  const social = context[globalName];
  assert.equal((await social.refresh()).generatedAt, 'one');
  assert.equal(snapshot.generatedAt, 'one');
  assert.equal(social.getCached().generatedAt, 'one');
  scope = {userId: null};
  assert.equal(social.getCached(), null);
  assert.equal(await social.refresh(), null);
  scope = {userId: 'two'};
  assert.equal(social.getCached(), null);
  assert.equal((await social.refresh()).generatedAt, 'two');
  assert.equal(snapshot.generatedAt, 'two');
}
console.log('PASS friends and groups use the current player snapshot across ordinary sign-in and sign-out.');
