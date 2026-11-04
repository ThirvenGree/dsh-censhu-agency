import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { installControl, nativePetAgency } from './control-install.mjs';

test('Pet native integration survives repeated adapter registration without old textual patches', () => {
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'agency-native-pet-'));
  const profile=path.join(home,'profiles/desktop'), pet=path.join(profile,'node_modules/dsh-pet/lib');
  try {
    fs.mkdirSync(pet,{recursive:true});
    fs.mkdirSync(path.join(home,'characters/censhu'),{recursive:true});
    fs.writeFileSync(path.join(home,'characters/censhu/integration.json'),JSON.stringify({sessionId:'fixture'}));
    const source='export const protocol="censhu-pet-agency-v1"; export const api={agencySay(){},agencyMotion(){},petCorrection(){}};';
    for(const file of ['index.js','app.js']) fs.writeFileSync(path.join(pet,file),source);
    assert.equal(installControl(profile),2);
    assert.equal(installControl(profile),2);
    for(const file of ['index.js','app.js']) assert.equal(fs.readFileSync(path.join(pet,file),'utf8'),source);
    const cfg=JSON.parse(fs.readFileSync(path.join(home,'censhu-agency/control.json')));
    assert.equal(Object.keys(cfg.hashes).length,2);
    assert.throws(()=>nativePetAgency('censhu-pet-agency-v1 agencySay'),/接口不完整/);
    assert.equal(nativePetAgency('old Pet bundle'),false);
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});
