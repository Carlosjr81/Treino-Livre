# As versões dos Termos de Uso

Cada arquivo `<versão>.txt` é o texto **exato** dos Termos de Uso daquela
versão, como o app o guarda (`JSON.stringify(TERMOS_USO)`). É a prova de qual
texto a pessoa aceitou: o histórico de aceites (Painel de usuários › 📜
Histórico de aceites dos termos) guarda, em cada aceite, a impressão digital
SHA-256 desse texto.

Para conferir uma impressão digital:

```bash
sha256sum termos-versoes/2026-10-29.txt
```

O resultado tem de ser igual à "Impressão digital do texto" do aceite.

**Nunca altere nem apague um arquivo daqui.** Mudou o texto dos termos no
app? Suba `TERMOS_USO.versao` e crie o arquivo da versão nova (o
`teste-acesso.js` reprova se o texto do app não for igual ao arquivo da versão
de agora).
