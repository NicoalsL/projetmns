// À exécuter avec la stack locale démarrée : npm run test:reel.
// Crée deux comptes synthétiques uniques et supprime uniquement ces comptes
// (et leurs cours par cascade) à la fin, même si une assertion échoue.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const pool = require('../src/config/postgres');
const base = process.env.API_URL || 'http://127.0.0.1:3000';
const prefixe = 'verification-' + randomUUID();
const emails = [prefixe + '-a@example.test', prefixe + '-b@example.test'];
const motDePasse = 'Test-local-' + randomUUID();
let nombre = 0;
async function appel(chemin, {method='GET',body,jeton}={}) {
  const r = await fetch(base + chemin, { method, headers: { 'Content-Type':'application/json', ...(jeton?{Authorization:'Bearer '+jeton}:{}) }, ...(body===undefined?{}:{body:JSON.stringify(body)}) });
  const texte = await r.text();
  return {statut:r.status,donnees:texte?JSON.parse(texte):null};
}
function verifier(obtenu, attendu, description) { assert.deepEqual(obtenu,attendu,description); nombre++; }
async function executer() {
  const a=await appel('/api/auth/inscription',{method:'POST',body:{nom:'Compte de test A',email:emails[0],motDePasse}});
  const b=await appel('/api/auth/inscription',{method:'POST',body:{nom:'Compte de test B',email:emails[1],motDePasse}});
  verifier(a.statut,201,'inscription A');verifier(b.statut,201,'inscription B');
  const jetonA=a.donnees.jeton,jetonB=b.donnees.jeton;
  verifier((await appel('/api/cours')).statut,401,'liste sans session');
  const titre="Cours de test : SQL ' ; <script>aucuneExecution()</script>";
  const contenu='La cellule est une unité du vivant.\n'.repeat(700);
  const cree=await appel('/api/cours',{method:'POST',jeton:jetonA,body:{titre,contenuTexte:contenu,id_utilisateur:b.donnees.utilisateur.id_utilisateur}});
  verifier(cree.statut,201,'création de plus de 16 ko');
  const id=cree.donnees.id_cours;
  const ligne=await pool.query('SELECT id_utilisateur, titre, contenu_texte FROM cours WHERE id_cours = $1',[id]);
  verifier(ligne.rows[0],{id_utilisateur:a.donnees.utilisateur.id_utilisateur,titre,contenu_texte:contenu.trim()},'persistance réelle et auteur imposé par le JWT');
  const connexion=await appel('/api/auth/connexion',{method:'POST',body:{email:emails[0],motDePasse}});
  verifier(connexion.statut,200,'reconnexion A');
  const apresReconnexion=await appel('/api/cours/'+id,{jeton:connexion.donnees.jeton});
  verifier(apresReconnexion.donnees.contenu_texte,contenu.trim(),'cours conservé après reconnexion');
  const listeA=await appel('/api/cours',{jeton:jetonA});
  verifier(listeA.donnees.map(c=>c.id_cours),[id],'liste A');
  verifier(Object.hasOwn(listeA.donnees[0],'contenu_texte'),false,'liste sans chargement des textes');
  verifier((await appel('/api/cours',{jeton:jetonB})).donnees,[],'liste B isolée');
  verifier((await appel('/api/cours/'+id,{jeton:jetonB})).statut,404,'lecture interdite à B');
  verifier((await appel('/api/cours/'+id,{method:'DELETE',jeton:jetonB})).statut,404,'suppression interdite à B');
  verifier((await appel('/api/cours/'+id,{jeton:jetonA})).statut,200,'cours encore présent après tentative de B');
  verifier((await appel('/api/cours/1%20OR%201=1',{jeton:jetonA})).statut,400,'identifiant injecté refusé');
  verifier((await appel('/api/cours',{method:'POST',jeton:jetonA,body:{titre:'  ',contenuTexte:'test'}})).statut,400,'titre vide refusé');
  verifier((await appel('/api/cours',{method:'POST',jeton:jetonA,body:{titre:'test',contenuTexte:'x'.repeat(50001)}})).statut,400,'cours trop long refusé');
  verifier((await appel('/api/cours/'+id,{method:'DELETE',jeton:jetonA})).statut,204,'suppression par le propriétaire');
  verifier((await appel('/api/cours/'+id,{jeton:jetonA})).statut,404,'lecture après suppression');
  verifier((await appel('/api/cours',{jeton:jetonA})).donnees,[],'liste vide après suppression');
}
(async()=>{
  try { await executer();console.log(nombre+' vérifications réussies sur la vraie API et PostgreSQL.'); }
  finally {
    await pool.query('DELETE FROM utilisateur WHERE email = ANY($1::text[])',[emails]);
    await pool.end();
    console.log('Comptes et cours synthétiques nettoyés.');
  }
})().catch(erreur=>{console.error(erreur.message);process.exitCode=1;});
