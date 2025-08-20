

---

## **Especificação Técnica — Sistema de Roda da Sorte**

**Objetivo:** Criar uma aplicação web interativa de sorteios com roda animada, dividida em três módulos: **LOGIN**, **CONFIG** e **REALTIME**.

---

### **Fluxo Geral**

1. Exibir **página de login** com campo para `ID_SORTEIO` e botão **Entrar**.
2. Ao enviar o `ID_SORTEIO`:
   * **Se não existir:** usuário se torna **configurador** e é redirecionado para **CONFIG**.
   * **Se existir:** usuário se torna **espectador** e é redirecionado para **REALTIME**.
3. **Não existe autenticação**. O primeiro a criar o `ID_SORTEIO` é o único configurador.
4. Comunicação entre CONFIG e REALTIME via **WebSocket**.

---

### **Módulos**

#### **1. LOGIN**

* **Elementos:**

  * Campo de texto: `input_ID_SORTEIO` (string).
  * Botão: `btn_entrar` (submete `ID_SORTEIO`).

---

#### **2. CONFIGURAÇÃO E EXECUÇÃO (CONFIG)** — *Apenas 1 usuário por sorteio*

* **Elementos de interface:**

* **Botões:**

  * Novo botão: `BOTAO_SINCRONIZAR_CONFIG` → Envia configuração completa para todos em REALTIME.

* **Regras de funcionamento:**

  * Alterações **não** são propagadas automaticamente — é necessário clicar `BOTAO_SINCRONIZAR_CONFIG`.

---

#### **3. ACOMPANHAMENTO EM TEMPO REAL (REALTIME)** — *Múltiplos usuários*

* **Elementos de interface:**

  1. **Roda da Sorte** idêntica à de CONFIG (mesma lista de itens, cores e dimensões).
  2. Botão `btn_sair` — encerra conexão WebSocket.

* **Regras de funcionamento:**

  * Recebe configuração somente quando configurador clicar `BOTAO_SINCRONIZAR_CONFIG`.
  * Recebe mensagens de texto a qualquer momento.
  * Ao receber comando de sorteio, roda gira com **mesma animação e resultado** do CONFIG.

---


---

### **Stack Tecnológico**
* **Comunicação em tempo real:** WebSocket.
* **Use:** Typescript
* **Layout:** Manter layout atual, mesmas fontes, mesma palete de cores etc.



---


