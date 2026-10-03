import test from 'node:test'
import assert from 'node:assert/strict'
import { surveillerSession, sessionValide } from '../src/auth/session.js'

const debut = 1700000000000
function jeton(expiration) { return 'a.' + Buffer.from(JSON.stringify({exp:expiration/1000})).toString('base64url') + '.b' }
function environnement(t) {
  t.mock.timers.enable({ apis:['Date','setTimeout'], now:debut })
  const sauvegarde = new Map(['window','localStorage'].map(cle=>[cle,Object.getOwnPropertyDescriptor(globalThis,cle)]))
  const donnees=new Map()
  Object.defineProperty(globalThis,'window',{value:new EventTarget(),configurable:true})
  Object.defineProperty(globalThis,'localStorage',{value:{getItem:cle=>donnees.get(cle)??null,setItem:(cle,v)=>donnees.set(cle,v),removeItem:cle=>donnees.delete(cle)},configurable:true})
  const nettoyages=[]
  t.after(()=>{for(const arreter of nettoyages) arreter();for(const [cle,descripteur] of sauvegarde){if(descripteur)Object.defineProperty(globalThis,cle,descripteur);else delete globalThis[cle]}})
  const remplacer=(valeur)=>{localStorage.setItem('jeton',valeur);const e=new Event('storage');Object.defineProperty(e,'key',{value:'jeton'});window.dispatchEvent(e)}
  remplacer.nettoyer=(arreter)=>nettoyages.push(arreter)
  return remplacer
}
test('un renouvellement multi-onglets remplace le minuteur et expire au nouveau terme',t=>{
  const remplacer=environnement(t), valeurs=[]
  localStorage.setItem('jeton',jeton(debut+3000))
  const arreter=surveillerSession(j=>valeurs.push(j));remplacer.nettoyer(arreter)
  remplacer(jeton(debut+6000));t.mock.timers.tick(3500)
  assert.equal(valeurs.at(-1),jeton(debut+6000))
  t.mock.timers.tick(2500);assert.equal(valeurs.at(-1),null)
})
test('un nouveau jeton qui expire plus tôt avance aussi le minuteur',t=>{
  const remplacer=environnement(t), valeurs=[]
  localStorage.setItem('jeton',jeton(debut+6000))
  const arreter=surveillerSession(j=>valeurs.push(j));remplacer.nettoyer(arreter)
  remplacer(jeton(debut+1000));t.mock.timers.tick(1000);assert.equal(valeurs.at(-1),null)
})
test('le nettoyage retire les minuteurs et les écouteurs',t=>{
  const remplacer=environnement(t),valeurs=[]
  localStorage.setItem('jeton',jeton(debut+1000));const arreter=surveillerSession(j=>valeurs.push(j));arreter()
  remplacer(jeton(debut+2000));t.mock.timers.tick(3000);assert.equal(valeurs.length,1)
})
test('un événement de déconnexion invalide immédiatement la session',t=>{
  const remplacer=environnement(t);const valeurs=[]
  localStorage.setItem('jeton',jeton(debut+6000));const arreter=surveillerSession(j=>valeurs.push(j));remplacer.nettoyer(arreter)
  localStorage.removeItem('jeton');window.dispatchEvent(new Event('session-expiree'));assert.equal(valeurs.at(-1),null)
})
test('jetons incomplets, expirés et dates non numériques refusés',()=>{
  for(const j of ['', 'invalide','a.'+Buffer.from(JSON.stringify({exp:'9999999999'})).toString('base64url')+'.b',jeton(0)]) assert.equal(sessionValide(j),false)
})
