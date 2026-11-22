/** Avatar texte — initiales, sans asset externe. */

export function AvatarInitiales({
  name,
  size = 28,
}: {
  name: string;
  size?: number;
}) {
  const initials = name
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
        fontSize: Math.max(10, Math.round(size * 0.4)),
        fontWeight: 'var(--font-weight-medium)' as string,
        background: 'var(--color-background-muted)',
        color: 'var(--color-text)',
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </span>
  );
}
