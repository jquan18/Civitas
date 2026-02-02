# 🧩 CORE COMPONENT LIBRARY: CIVITAS

This library defines the reusable "Loud Finance" components.

## 1. The "Hard" Button

A button that feels like a physical switch. It screams "CLICK ME".

-   **Border:** `3px solid black`
-   **Shadow:** `4px 4px 0px black` (Hard offset, no blur, `box-shadow: 4px 4px 0px #000`)
-   **Rounding:** `0px` (Sharp)
-   **States:**
    -   *Default:* Acid Lime (`#CCFF00`) background. One-level z-index feel.
    -   *Hover:* Translate 2px 2px down/right. Shadow reduces to `2px`.
    -   *Active (Click):* Translate 4px 4px down/right. Shadow disappears (`0px`). Button is flush with the "surface".

**Code Snippet (Tailwind):**
```jsx
<button className="bg-[#CCFF00] border-[3px] border-black text-black font-black px-6 py-4 shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all uppercase tracking-wide">
  Execute Bridge
</button>
```

## 2. The "Comic" Chat Bubble

Distinct styles to separate the Agent (System) from the Operator (User).

### Agent (Left Align)
-   **Box:** Stark White (`#FFFFFF`), 3px Black Border, Sharp corners.
-   **Shadow:** `2px 2px 0px Black`.
-   **Indicator:** A sharp triangular notch on the left.
-   **Typography:** Monospaced data text or clean logic font.

### User (Right Align)
-   **Box:** Hot Pink (`#FF00FF`), 3px Black Border.
-   **Text:** Bold Black text (All Caps for extra "Loudness").
-   **Indicator:** A sharp triangular notch on the right.

## 3. The "Jagged" Receipt

The hero component for the Execution Zone. It represents a physical transaction slip.

-   **Shape:** Long vertical white rectangle (`w-full max-w-md`).
-   **Border:** `3px solid black` (Sides and Top).
-   **The Hack (Zig-Zag Bottom):**
    -   Use `mask-image` with a radial gradient repeater or a pseudo-element with `clip-path` polygon to create the "torn paper" effect at the bottom.
    -   *Alternative:* A repeating SVG background image on the bottom edge (`radial-gradient(circle, transparent 50%, #fff 50%)`).
-   **Content:**
    -   **Dividers:** Dashed lines `----------------` (using `border-dashed`).
    -   **"TOTAL" Row:** Highlighted in Black (`bg-black`) with White text (`text-white`).
    -   **Barcode:** A fake Barcode at the bottom using a font or SVG pattern.

## 4. The "Terminal" Input

The primary interface for commanding the agent.

-   **Style:** White background, thick black border (`border-2` or `border-3`).
-   **Indicator:** A bright Acid Lime (`#CCFF00`) block with a chevron (`>`) on the left side.
-   **Cursor:** A custom thick, blinking black block (`_` or `█`).
-   **Focus:** Hard shadow glow `box-shadow: 4px 4px 0px #000`.

**Code Snippet:**
```jsx
<div class="relative flex-grow">
    <span class="absolute left-4 top-1/2 -translate-y-1/2 font-headline text-primary text-xl">></span>
    <input class="w-full bg-off-white border-2 border-black h-16 pl-10 pr-4 font-mono text-lg focus:ring-0 focus:outline-none focus:shadow-hard transition-shadow placeholder:text-gray-400" placeholder="Type command..." type="text"/>
</div>
```
