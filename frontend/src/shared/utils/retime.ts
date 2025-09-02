// frontend/src/shared/utils/retime.ts

/**
 * Utilities to retime elements and script start based on cumulative delays.
 * These are pure helpers shared by host and guest sides to keep behavior identical.
 */

export interface TimedElementLike {
  element_id: string;
  offset_ms: number;
  sequence?: number;
  [key: string]: any;
}

/**
 * Returns true if the array's `offset_ms` values are non-decreasing.
 */
export const isMonotonicByOffset = (elements: TimedElementLike[]): boolean => {
  for (let i = 1; i < elements.length; i++) {
    if ((elements[i]?.offset_ms ?? 0) < (elements[i - 1]?.offset_ms ?? 0)) return false;
  }
  return true;
};

/**
 * Binary search to find first index with offset_ms > baseTimeMs in a monotonic array.
 */
export const findFirstUnplayedIndex = (elements: TimedElementLike[], baseTimeMs: number): number => {
  let lo = 0, hi = elements.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if ((elements[mid]?.offset_ms ?? 0) <= baseTimeMs) lo = mid + 1; else hi = mid;
  }
  return lo;
};

/**
 * Apply a positive delta (ms) to all elements with offset_ms > baseTimeMs.
 * Returns the original array if delta is not positive, otherwise returns a new array
 * reusing the unmodified head and cloning the modified tail to minimize allocations.
 */
export const retimeUnplayedElements = (
  elements: TimedElementLike[],
  baseTimeMs: number,
  deltaMs: number
): TimedElementLike[] => {
  if (!elements || elements.length === 0 || !Number.isFinite(deltaMs) || deltaMs <= 0) return elements;

  if (isMonotonicByOffset(elements)) {
    const idx = findFirstUnplayedIndex(elements, baseTimeMs);
    if (idx >= elements.length) return elements;
    const head = elements.slice(0, idx);
    const tail = elements.slice(idx).map(el => ({ ...el, offset_ms: (el.offset_ms || 0) + deltaMs }));
    return head.concat(tail);
  }

  // Fallback: not sorted — map all and adjust conditionally
  let changed = false;
  const adjusted = elements.map(el => {
    const off = el.offset_ms || 0;
    if (off > baseTimeMs) {
      changed = true;
      return { ...el, offset_ms: off + deltaMs };
    }
    return el;
  });
  return changed ? adjusted : elements;
};

/**
 * Shift an ISO start time forward by deltaMs. Returns original if invalid.
 */
export const shiftScriptStartTime = (startTimeISO: string | undefined | null, deltaMs: number): string | undefined => {
  if (!startTimeISO || !Number.isFinite(deltaMs) || deltaMs <= 0) return startTimeISO || undefined;
  const start = new Date(startTimeISO);
  if (isNaN(start.getTime())) return startTimeISO || undefined;
  const shifted = new Date(start.getTime() + deltaMs);
  return shifted.toISOString();
};

