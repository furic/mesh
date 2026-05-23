<script lang="ts">
  import type { Suburb } from '$lib/types'
  import { questStore } from '$lib/stores/quests.svelte'

  interface Props {
    suburb: Suburb
  }
  let { suburb }: Props = $props()

  interface Message {
    role:    'user' | 'assistant'
    content: string
  }

  let messages    = $state<Message[]>([])
  let input       = $state('')
  let isStreaming = $state(false)
  let errorMsg    = $state<string | null>(null)
  let questSavedTitle = $state<string | null>(null)
  let listEl: HTMLDivElement | null = $state(null)

  let questSlot = $derived(questStore.slot(suburb.id))
  let canMakeQuest = $derived(
    !isStreaming && !questSlot.loading &&
    messages.some((m) => m.role === 'assistant' && m.content.trim().length > 0),
  )

  // Reset chat whenever the user picks a different suburb.
  $effect(() => {
    void suburb.id  // track id as dep
    messages = []
    errorMsg = null
    input = ''
    questSavedTitle = null
  })

  $effect(() => {
    // Autoscroll on every message update.
    messages
    if (listEl) listEl.scrollTop = listEl.scrollHeight
  })

  async function send() {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg: Message = { role: 'user', content: text }
    const wireMessages = [...messages, userMsg]
    messages = [...wireMessages, { role: 'assistant', content: '' }]
    input = ''
    isStreaming = true
    errorMsg = null

    try {
      const res = await fetch('/api/agents/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: wireMessages, suburb_id: suburb.id }),
      })

      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => '')
        throw new Error(detail || `HTTP ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Anthropic SSE: events separated by blank lines; each event has
      // `event: <type>` and `data: <json>` lines.
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const dataLine = rawEvent.split('\n').find((l) => l.startsWith('data:'))
          if (!dataLine) continue
          const payload = dataLine.slice(5).trim()
          if (!payload || payload === '[DONE]') continue

          try {
            const obj = JSON.parse(payload)
            if (
              obj.type === 'content_block_delta' &&
              obj.delta?.type === 'text_delta' &&
              typeof obj.delta.text === 'string'
            ) {
              appendToLast(obj.delta.text)
            }
          } catch {
            // Ignore non-JSON keepalives.
          }
        }
      }
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : String(e)
      // Drop the empty assistant bubble if nothing streamed.
      if (messages.at(-1)?.role === 'assistant' && messages.at(-1)?.content === '') {
        messages = messages.slice(0, -1)
      }
    } finally {
      isStreaming = false
    }
  }

  function appendToLast(chunk: string) {
    const last = messages.at(-1)
    if (!last || last.role !== 'assistant') return
    messages = [...messages.slice(0, -1), { role: 'assistant', content: last.content + chunk }]
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  async function turnIntoQuest() {
    questSavedTitle = null
    const quest = await questStore.generate(suburb.id, { messages })
    if (quest) {
      questSavedTitle = quest.title
    }
  }
</script>

<section class="advisor" aria-label="Initiative advisor chat">
  <header>
    <span class="eyebrow">Initiative advisor</span>
    <h4>Ask Claude about {suburb.name}</h4>
  </header>

  <div class="messages" bind:this={listEl}>
    {#if messages.length === 0}
      <p class="empty">
        Try: <em>"What's a free initiative that would lift {suburb.name}'s
        {Object.entries(suburb.scores).reduce((a, b) => (a[1] < b[1] ? a : b))[0]} score?"</em>
      </p>
    {/if}
    {#each messages as m, i (i)}
      <div class="msg" class:user={m.role === 'user'} class:assistant={m.role === 'assistant'}>
        <span class="role">{m.role === 'user' ? 'You' : 'Advisor'}</span>
        <p>{m.content}{#if isStreaming && m.role === 'assistant' && i === messages.length - 1}<span class="cursor">▍</span>{/if}</p>
      </div>
    {/each}
    {#if errorMsg}
      <div class="msg error">
        <span class="role">Error</span>
        <p>{errorMsg}</p>
      </div>
    {/if}
  </div>

  <form
    class="composer"
    onsubmit={(e) => { e.preventDefault(); send() }}
  >
    <input
      type="text"
      placeholder="Ask about an initiative…"
      bind:value={input}
      onkeydown={onKeydown}
      disabled={isStreaming}
      aria-label="Message"
    />
    <button type="submit" disabled={isStreaming || !input.trim()}>
      {isStreaming ? '…' : 'Send'}
    </button>
  </form>

  <div class="actions">
    <button
      type="button"
      class="secondary"
      onclick={turnIntoQuest}
      disabled={!canMakeQuest}
      title={canMakeQuest ? 'Generate a quest based on this conversation' : 'Chat with the advisor first'}
    >
      {#if questSlot.loading}
        Generating quest…
      {:else if questSavedTitle}
        ✓ Saved "{questSavedTitle}"
      {:else}
        Turn this into a quest →
      {/if}
    </button>
    {#if questSavedTitle || questSlot.quest}
      <a href="/quests" class="link">Open quest board</a>
    {/if}
    {#if questSlot.error}
      <span class="err">{questSlot.error}</span>
    {/if}
  </div>
</section>

<style>
  .advisor {
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(139, 182, 255, 0.18);
    border-radius: 10px;
    padding: 14px 14px 12px;
    min-height: 240px;
  }

  header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .eyebrow {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: #8bb6ff;
    font-weight: 600;
  }
  header h4 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: #e5ecff;
  }

  .messages {
    flex: 1;
    min-height: 120px;
    max-height: 220px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-right: 4px;
  }
  .empty {
    margin: 0;
    color: #8a96b3;
    font-size: 0.78rem;
    line-height: 1.5;
  }
  .empty em {
    color: #aab4cc;
    font-style: normal;
    background: rgba(139, 182, 255, 0.08);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .msg {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .msg .role {
    font-size: 0.62rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: #6e7993;
  }
  .msg p {
    margin: 0;
    font-size: 0.85rem;
    line-height: 1.5;
    white-space: pre-wrap;
    color: #e5ecff;
  }
  .msg.user p {
    color: #c2d8ff;
  }
  .msg.error .role { color: #e57373; }
  .msg.error p     { color: #f3b3b3; }

  .cursor {
    display: inline-block;
    margin-left: 1px;
    color: #8bb6ff;
    animation: blink 1s steps(2, end) infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
  }

  .composer {
    display: flex;
    gap: 8px;
  }
  input {
    flex: 1;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    color: #e5ecff;
    padding: 8px 10px;
    font: inherit;
    font-size: 0.85rem;
  }
  input:focus {
    outline: none;
    border-color: rgba(139, 182, 255, 0.5);
    background: rgba(255, 255, 255, 0.06);
  }
  input:disabled { opacity: 0.6; }

  button {
    background: linear-gradient(180deg, #5481d6, #3962b8);
    border: 1px solid rgba(139, 182, 255, 0.5);
    color: white;
    border-radius: 8px;
    padding: 8px 16px;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: filter 120ms ease;
  }
  button:hover:not(:disabled) { filter: brightness(1.15); }
  button:disabled { opacity: 0.5; cursor: default; }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding-top: 6px;
    border-top: 1px dashed rgba(255, 255, 255, 0.05);
    margin-top: 2px;
  }
  button.secondary {
    background: transparent;
    border: 1px dashed rgba(139, 182, 255, 0.4);
    color: #c2d8ff;
    padding: 7px 12px;
    font-size: 0.78rem;
    font-weight: 500;
    border-radius: 6px;
  }
  button.secondary:hover:not(:disabled) {
    background: rgba(139, 182, 255, 0.08);
    border-style: solid;
    filter: none;
  }
  button.secondary:disabled { border-style: dotted; opacity: 0.45; }
  .actions .link {
    font-size: 0.78rem;
    color: #8bb6ff;
    text-decoration: none;
    border-bottom: 1px solid rgba(139, 182, 255, 0.3);
  }
  .actions .link:hover { color: #c2d8ff; }
  .actions .err {
    font-size: 0.75rem;
    color: #e57373;
  }
</style>
