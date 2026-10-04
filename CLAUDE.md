# EduQuizAI — instructions pour Claude Code

Les conventions du projet sont partagées avec les autres assistants (Codex lit
`AGENTS.md`). Elles s'appliquent intégralement :

@AGENTS.md

Commandes utiles :

- Back : `cd eduquizai/back && npm test`
- Front : `cd eduquizai/front && npm test && npm run lint && npm run build`
- Stack complète : `cd eduquizai && docker compose up --build`
- Vérification sur la vraie base (stack démarrée) : `docker compose exec -T back node scripts/verifier-cours-reel.js`
