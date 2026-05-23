<script lang="ts">
  // Deterministic initials avatar. No photo support yet — profiles.avatar_url
  // will hook in once Supabase Storage is wired (Sprint 7).

  interface Props {
    name:  string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }
  let { name, size = 'md' }: Props = $props();

  function initials(n: string): string {
    const parts = n.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '·';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Stable hue from the name so the same person always gets the same color.
  function hueFor(n: string): number {
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
    return h;
  }

  let hue = $derived(hueFor(name || '·'));
  let initials_ = $derived(initials(name || '·'));
</script>

<span
  class="avatar size-{size}"
  style="--hue: {hue}"
  aria-label={name}
  role="img"
>{initials_}</span>

<style>
  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(140deg, hsl(var(--hue) 55% 58%), hsl(calc(var(--hue) + 32) 55% 38%));
    color: #0a1018;
    font-family: 'Bricolage Grotesque', -apple-system, sans-serif;
    font-weight: 700;
    letter-spacing: 0.02em;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.15) inset, 0 6px 18px -8px rgba(0, 0, 0, 0.5);
    user-select: none;
    flex-shrink: 0;
  }
  .size-sm { width: 28px; height: 28px; font-size: 0.72rem; }
  .size-md { width: 40px; height: 40px; font-size: 0.95rem; }
  .size-lg { width: 64px; height: 64px; font-size: 1.45rem; }
  .size-xl { width: 96px; height: 96px; font-size: 2.1rem; }
</style>
