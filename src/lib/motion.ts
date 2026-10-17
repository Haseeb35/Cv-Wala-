// Shared motion tokens. Springs are tuned to settle fast without wobble,
// so the UI feels immediate rather than floaty.
export const snappy = { type: "spring", stiffness: 640, damping: 44, mass: 0.7 } as const;
export const smooth = { type: "spring", stiffness: 340, damping: 34, mass: 0.9 } as const;
export const gentle = { type: "spring", stiffness: 160, damping: 24, mass: 1 } as const;
export const ease = [0.22, 0.8, 0.24, 1] as const;
export const quick = { duration: 0.2, ease } as const;

export const tap = { scale: 0.965 } as const;
