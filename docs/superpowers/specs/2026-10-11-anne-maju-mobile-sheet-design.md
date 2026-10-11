# Anne Maju shift card — mobile bottom sheet + look

**Status:** done  
**Done when:** on narrow phones the ShiftCard is a bottom sheet that leaves the move joystick free; LookPad + Q/R yaw still orbit a full 360° while the card is open; walk-out still closes the overlay.

## Locked choices

| Choice | Value |
|---|---|
| Mobile layout | Bottom sheet (option A) |
| Camera | Yaw-only, reliable full orbit (option A) |
| Desktop | Keep left cream card |
| Breakpoint | `max-[520px]` / short height (match live-shift panel) |

## Behaviour

- Narrow/short: ShiftCard (and ResultCard for the same thumb conflict) docks bottom, `max-h` ~40% dvh, scrolls inside, clears stick band (~9.5rem + safe area).
- Sticks: `z-50` so they always receive touches.
- Look: existing LookPad + `lookAxis()` (Q/,/[ · R/./]); no pitch.
- Mid-shift unchanged (sticks hidden, serving camera).
