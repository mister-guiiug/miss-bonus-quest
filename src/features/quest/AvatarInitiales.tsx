import type { Membre } from './types.ts';

/** Avatar — emoji, sinon initiales sur fond coloré. */

export function AvatarInitiales({
  name,
  size = 28,
  emoji,
  color,
  membre,
}: {
  name?: string;
  size?: number;
  emoji?: string | null;
  color?: string | null;
  membre?: Pick<Membre, 'displayName' | 'avatarEmoji' | 'avatarColor'>;
}) {
  const label = membre?.displayName ?? name ?? '?';
  const face = membre?.avatarEmoji ?? emoji;
  const bg = membre?.avatarColor ?? color ?? 'var(--color-background-muted)';

  const initials = label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      data-quest="avatar"
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '999px',
        fontSize: face
          ? Math.max(12, Math.round(size * 0.55))
          : Math.max(10, Math.round(size * 0.4)),
        fontWeight: 'var(--font-weight-medium)' as string,
        background: bg,
        color: 'var(--color-text)',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {face || initials || '?'}
    </span>
  );
}
