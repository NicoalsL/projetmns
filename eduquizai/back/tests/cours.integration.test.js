// Tests HTTP des cours avec dépôt SQL réel et pool simulé : les requêtes et
// l'identité passée à PostgreSQL sont vérifiées, sans prétendre tester la BDD.
jest.mock('../src/config/postgres', () => ({ query: jest.fn() }));
const pool = require('../src/config/postgres');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
let serveur, base, jeton;
beforeAll(async () => {
  process.env.JWT_SECRET = 'c'.repeat(64);
  jeton = jwt.sign({ id_utilisateur: 7 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  await new Promise(resolve => { serveur = app.listen(0, '127.0.0.1', resolve); });
  base = 'http://127.0.0.1:' + serveur.address().port;
});
afterAll(() => new Promise(resolve => { serveur.close(resolve); serveur.closeAllConnections(); }));
beforeEach(() => pool.query.mockReset());
function appeler(chemin, { method = 'GET', body, token = jeton } = {}) {
  return fetch(base + '/api/cours' + chemin, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const donnees = { titre: 'Biologie', contenuTexte: 'La cellule est une unité du vivant.' };
test.each(['GET','POST','DELETE'])('refuse une requête %s sans session', async method => {
  const r = await appeler(method === 'DELETE' ? '/1' : '', {method,body:method==='POST'?donnees:undefined,token:null});
  expect(r.status).toBe(401);expect(pool.query).not.toHaveBeenCalled();
});
test('refuse une identité JWT absente même avec une signature valide', async () => {
  const token = jwt.sign({}, process.env.JWT_SECRET, {expiresIn:'1h'});
  expect((await appeler('',{token})).status).toBe(401);expect(pool.query).not.toHaveBeenCalled();
});
test('création : ignore un propriétaire forgé et utilise les paramètres SQL', async () => {
  const titre = "Cours'); DROP TABLE cours; --";
  pool.query.mockResolvedValue({ rows: [{id_cours:3,titre,contenu_texte:donnees.contenuTexte,date_creation:'2026-10-03T00:00:00Z'}] });
  const r=await appeler('',{method:'POST',body:{...donnees,titre,id_utilisateur:999}});
  expect(r.status).toBe(201);expect(r.headers.get('location')).toBe('/api/cours/3');
  const [sql,params]=pool.query.mock.calls[0];expect(sql).not.toContain(titre);expect(params).toEqual([titre,donnees.contenuTexte,7]);
});
test('liste : filtre sur le propriétaire sans charger les textes', async () => {
  pool.query.mockResolvedValue({rows:[]});const r=await appeler('');expect(r.status).toBe(200);expect(await r.json()).toEqual([]);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id_utilisateur = $1'),[7]);
  expect(pool.query.mock.calls[0][0]).not.toContain('contenu_texte');
});
test('lecture : combine identifiant et propriétaire dans la requête',async()=>{
  pool.query.mockResolvedValue({rows:[{id_cours:3,titre:'Biologie'}]});
  expect((await appeler('/3')).status).toBe(200);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('id_cours = $1 AND id_utilisateur = $2'),[3,7]);
});
test.each(['GET','DELETE'])('cours absent ou non possédé : %s renvoie 404', async method => {
  pool.query.mockResolvedValue({rows:[],rowCount:0});const r=await appeler('/4',{method});
  expect(r.status).toBe(404);expect(await r.json()).toEqual({erreur:'Cours introuvable'});
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('id_cours = $1 AND id_utilisateur = $2'),[4,7]);
});
test('suppression propriétaire : une requête atomique, réponse vide 204',async()=>{
  pool.query.mockResolvedValue({rows:[{id_cours:4}],rowCount:1});const r=await appeler('/4',{method:'DELETE'});
  expect(r.status).toBe(204);expect(await r.text()).toBe('');expect(pool.query).toHaveBeenCalledTimes(1);
});
test.each(['0','-1','abc','1.2','2147483648','01',"1%20OR%201=1"])('refuse un identifiant invalide %s avant SQL',async id=>{
  expect((await appeler('/'+id)).status).toBe(400);expect(pool.query).not.toHaveBeenCalled();
});
test.each([
  null, [], {}, {...donnees,titre:'   '}, {...donnees,titre:3}, {...donnees,titre:'x'.repeat(201)},
  {...donnees,contenuTexte:' '}, {...donnees,contenuTexte:{}}, {...donnees,contenuTexte:'x'.repeat(50001)},
  {...donnees,titre:'a\0b'}, {...donnees,contenuTexte:'a\0b'},
])('rejette un cours invalide %#',async body=>{
  expect((await appeler('',{method:'POST',body})).status).toBe(400);expect(pool.query).not.toHaveBeenCalled();
});
test('accepte un cours de 50 000 caractères, y compris les caractères échappés',async()=>{
  pool.query.mockResolvedValue({rows:[{id_cours:3}]});
  const r=await appeler('',{method:'POST',body:{...donnees,contenuTexte:'\t'.repeat(49999)+'a'}});
  expect(r.status).toBe(201);
});
test('corps trop volumineux : 413 avant SQL',async()=>{
  expect((await appeler('',{method:'POST',body:{...donnees,contenuTexte:'x'.repeat(600000)}})).status).toBe(413);
  expect(pool.query).not.toHaveBeenCalled();
});
test('compte supprimé : 401 au lieu de révéler une erreur SQL',async()=>{
  pool.query.mockRejectedValue(Object.assign(new Error('FK'),{code:'23503',constraint:'cours_id_utilisateur_fkey'}));
  expect((await appeler('',{method:'POST',body:donnees})).status).toBe(401);
});
