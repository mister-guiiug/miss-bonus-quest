import {
  BedDouble,
  Brush,
  CookingPot,
  Sparkles,
  Table,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  bed: BedDouble,
  sparkles: Sparkles,
  table: Table,
  trash: Trash2,
  dish: CookingPot,
  brush: Brush,
};

export function ActeIcon({
  name,
  className = 'size-4',
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && MAP[name]) || Sparkles;
  return <Icon aria-hidden className={className} />;
}
