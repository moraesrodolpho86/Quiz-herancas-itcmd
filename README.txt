QUIZ RUNNER — HERANÇAS & ITCMD (V5)

ARQUIVOS:
- index.html  -> jogo completo (participante e apresentador)
- README.txt  -> instruções rápidas

COMO PUBLICAR NO GITHUB PAGES:
1. Envie o arquivo index.html para a raiz do repositório.
2. Vá em Settings > Pages.
3. Em Source, escolha Deploy from a branch.
4. Selecione branch main e pasta /(root).
5. Aguarde o deploy.

COMO ABRIR:
- Participante: seu-endereco/index.html
- Apresentador: seu-endereco/index.html?modo=apresentador
- PIN do apresentador: 1234

MELHORIAS DESTA VERSÃO:
- personagem corredor em pixel art embutido no jogo;
- contagem 3, 2, 1, GO! mais rápida;
- todos os jogadores aguardam a largada do apresentador;
- botão Iniciar partida só funciona no lobby e com jogador(es) presente(s);
- ranking e lista de jogadores com estados mais claros;
- bloqueio para entrada de novos jogadores no meio da corrida.

COMO TROCAR AS PERGUNTAS:
- Abra o arquivo index.html.
- Procure pelo bloco: const questions = [ ... ];
- Edite apenas esse bloco.
- correct: 0=A, 1=B, 2=C, 3=D.
