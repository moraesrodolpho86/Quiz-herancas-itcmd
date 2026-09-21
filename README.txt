Quiz Runner — Heranças & ITCMD — Pixel Race
Versão 3 — participante + modo apresentador

OBJETIVO
Jogo de corrida/quiz em pixel art ligado ao tema:
Herança, desigualdade e tributação (ITCMD).

COMO PUBLICAR
Para o modo multiplayer funcionar corretamente, publique o index.html no GitHub Pages.
Não é necessária biblioteca externa. O jogo usa a API REST do Firebase Realtime Database.

MODO PARTICIPANTE
Abra:
https://SEU-USUARIO.github.io/SEU-REPOSITORIO/

O participante:
1. informa duas iniciais;
2. entra na linha de largada;
3. aguarda o apresentador;
4. recebe a contagem 3, 2, 1, GO!;
5. responde 10 perguntas;
6. corre mais rápido quando acerta;
7. ganha combo com acertos consecutivos;
8. perde velocidade temporariamente ao errar.

MODO APRESENTADOR
Abra:
https://SEU-USUARIO.github.io/SEU-REPOSITORIO/?modo=apresentador

PIN padrão:
1234

O modo apresentador também é em pixel art e mostra um professor/treinador,
participantes na largada/correndo, respostas recebidas e ranking ao vivo.

DURAÇÃO
Cada pergunta possui até 15 segundos.
O percurso foi calibrado para a partida ficar abaixo de aproximadamente 3 minutos,
normalmente terminando antes disso.

COMO ALTERAR AS PERGUNTAS
No index.html procure:
"PARA TROCAR AS PERGUNTAS, EDITE SOMENTE ESTE BLOCO."

Formato:
{
  question: "Pergunta?",
  answers: ["A","B","C","D"],
  correct: 1
}

CAMPO correct
0 = alternativa A
1 = alternativa B
2 = alternativa C
3 = alternativa D

OBSERVAÇÃO SOBRE O PIN
O PIN no código funciona como barreira de acesso casual.
Como o site é estático e público, ele não substitui autenticação forte.

© 2026 Rodolpho Moraes
