import type { Modifier, ModifierField } from '@/types';
import { safe } from '../math';

/** 특정 필드에 걸려 있는 모든 이벤트 효과의 합. */
export function modifierTotal(modifiers: readonly Modifier[], field: ModifierField): number {
  let total = 0;
  for (const modifier of modifiers) {
    if (modifier.field === field) total += safe(modifier.value);
  }
  return total;
}

/** 한 턴 경과: 남은 기간을 줄이고 만료된 효과를 제거한다. */
export function tickModifiers(modifiers: readonly Modifier[]): Modifier[] {
  const next: Modifier[] = [];
  for (const modifier of modifiers) {
    const turns = modifier.turns - 1;
    if (turns > 0) next.push({ ...modifier, turns });
  }
  return next;
}

export function addModifiers(
  modifiers: readonly Modifier[],
  incoming: readonly Modifier[],
): Modifier[] {
  return [...modifiers, ...incoming.map((m) => ({ ...m }))];
}
