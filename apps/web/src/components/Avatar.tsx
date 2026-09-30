import clsx from 'clsx';
import { Art } from '../art/Art';
import { BullPortrait, characterById } from '../art/BullPortrait';

export function Avatar({ id, size = 44, className, ring }: { id: string; size?: number; className?: string; ring?: string }) {
  const character = characterById(id);
  return (
    <span
      className={clsx('relative inline-block shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
    >
      <Art
        id={`character-${character.id}`}
        alt={character.name}
        className="size-full object-cover"
        fallback={<BullPortrait character={character} />}
      />
    </span>
  );
}
