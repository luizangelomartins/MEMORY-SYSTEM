# MEMORY-SYSTEM - versão estática

<div align="start"> 
  <a href="https://luizangelomartins.github.io/colori-system-test/">
  <img width="500" src="https://img.shields.io/badge/CLIQUE AQUI PARA ACESSAR-151515?style=for-the-badge"> 
</div>

#

Esta pasta é a versão somente leitura para hospedagem sem API.

Arquivos principais:
- `index.html`: tela estática.
- `dados.json`: base de dados publicada.
- `imagens/`: imagens gerais em Base64 `.txt`.
- `imagens_usuarios/`: fotos de usuários em Base64 `.txt`.
- `foto_usuario/usuario.txt`: foto única exibida no cabeçalho da versão leitura.
- `icones/memory-system.ico`: ícone do sistema.

Use uma hospedagem estática apontando para esta pasta.

Para testar localmente:

```bash
npx serve container-leitura
```

Ou qualquer servidor estático equivalente. Evite abrir o `index.html` direto via `file://`, pois o navegador pode bloquear a leitura do `dados.json`.
