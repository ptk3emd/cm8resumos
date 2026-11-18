import {expect} from '@playwright/test';
const settingsPages=new WeakMap();
// Use the real settings route in the same browser profile. Study remains open so
// the existing scenarios also verify cross-page synchronization of saved data.
export async function settingsFor(page){
 let settings=settingsPages.get(page);
 if(!settings||settings.isClosed()){
  settings=await page.context().newPage();settingsPages.set(page,settings);
  await settings.goto(new URL('configuracoes.html',page.url()).href);
  await expect(settings.locator('#workspace')).toHaveAttribute('aria-busy','false');
  await expect(settings.locator('#fsrsActivityMetric')).toHaveAttribute('aria-busy','false');
 }
 return settings;
}
