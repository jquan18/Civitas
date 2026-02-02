# ⚡ INTERACTION & ANIMATION GUIDE: CIVITAS

Motion in Civitas is not "smooth" in the Apple sense. It is "snappy" and "mechanical".

## 1. The "Marquee" (Infinite Scroll)
Used for the status bar at the top (`Zone B`).
-   **Animation:** Linear infinite translation (`translateX(-50%)`).
-   **Duration:** Slow (~20s). Constant movement implies the system is "Always On".
-   **Content:** Repeating string of system status key-value pairs.

```css
@keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}
.animate-marquee {
    animation: marquee 20s linear infinite;
}
```

## 2. The "Receipt Print" (Entry Animation)
When a transaction is drafted, the Receipt card shouldn't just fade in. It should **slide down** from the top as if being printed from a thermal printer.

-   **Trigger:** User confirms draft parameters.
-   **Motion:** `translateY(-100%)` to `translateY(0)`.
-   **Easing:** `ease-out` with a slight "hard stop" (no bounce).
-   **Sound (Optional):** A quick thermal printer "zzzt" sound.

## 3. The "Confirm" Smash
The definitive action of the app.
-   **Trigger:** User clicks the massive "CONFIRM" button.
-   **State 1 (Hover):** Button rises to meet the cursor (Translate `-2px -2px`).
-   **State 2 (Active/Press):** Button is CRUSHED into the page.
    -   Scale: `0.95`.
    -   Translate: `+4px +4px`.
    -   Shadow: None.
    -   Flash: The button background briefly flashes White (`#FFFFFF`) to signal electrical contact.

## 4. Cursor & Typing
-   **Blink:** The terminal cursor should use a `step-end` animation, not a smooth fade. It's either THERE or NOT THERE.
-   **Typing (Simulated):** If the Agent is typing, characters should appear one by one with variable speed (10ms - 50ms), mimicking a retro baud rate connection.

## 5. Glitch Effects (Status Changes)
When the "AGENT STATUS" changes (e.g., from "IDLE" to "EXECUTING"):
-   The text should briefly "glitch" (random character swaps or slight lateral shift) before settling on the new status.
-   Use CSS `clip-path` animations or simple text replacement.
