# 🎨 MASTER DESIGN PLAN: CIVITAS "REBEL PROTOCOL"

**Version:** 1.0 (Hackathon Release)
**Vibe:** "Finance is Loud." High-velocity, tactile, anti-corporate, raw.
**Inspiration:** 90s Zines, Gumroad, Figma, Cash App, Cyberpunk Terminals, Neo-Brutalism.

## 1. The Design Philosophy: "Loud Finance" to "Tactile Maximalism"

We are embracing **Neo-Brutalism** and **Tactile Maximalism**. The interface is not just a screen; it is a machine. Every interaction should feel physical, heavy, and consequential.

-   **Raw & Unpolished:** Exposed borders, default system fonts mixed with loud display type, high contrast.
-   **Tactile:** Buttons feel like switches. Cards feel like physical paper or plastic. Shadows are hard, not blurred.
-   **Kinetic:** Text moves. Marquees scroll. Elements slide and slam. The UI is alive.

## 2. The Color System

Strict adherence to these hex codes is required to maintain the aesthetic.

| Role | Color Name | Hex Code | Usage |
| :--- | :--- | :--- | :--- |
| **Canvas** | Paper Cream | `#FAF9F6` | Main background (Execution Zone). Warmth to offset the harshness. |
| **Structure** | Void Black | `#000000` | Borders, Text, Sidebar Background. The skeleton of the UI. |
| **Surface** | Stark White | `#FFFFFF` | Chat Bubbles, Receipt Cards, Input Fields. High contrast against the Void. |
| **Primary** | Acid Lime | `#CCFF00` | Submit Buttons, Active Icons, Marquee Bar. The energy source. |
| **Accent A** | Hot Pink | `#FF00FF` | User Chat Bubbles, "CONFIRM" Button, Alerts. Urgent attention. |
| **Accent B** | Warning Yellow | `#FFD600` | Secondary Alerts, Badges. Cautionary signals. |

### CSS Variables
```css
:root {
  --bg-cream: #FAF9F6;
  --bg-black: #000000;
  --text-main: #000000;
  --text-inverse: #FFFFFF;
  --accent-lime: #CCFF00;
  --accent-pink: #FF00FF;
  --border-width: 3px;
  --shadow-offset: 4px; /* The "Hard" shadow depth */
}
```

## 3. Typography

Mix massive, aggressive headlines with technical data fonts.

### Headlines (The "Shout")
**Font:** `Archivo Black` or `Clash Display` (Bold/Black weight).
**Usage:** Headers, "CONFIRM" buttons, "RECEIPT" titles.
**Vibe:** IMPACTFUL. LOUD.

### Data & Code (The "Receipt")
**Font:** `JetBrains Mono` or `Space Mono`.
**Usage:** Numbers, Wallet Addresses, Gas Fees, Input Text, Logs.
**Vibe:** Technical, precise, machine-generated.

### Body (The "Chat")
**Font:** `Plus Jakarta Sans` or `Inter` (Bold weight preferred).
**Usage:** Agent responses, Sidebar tooltips, general text.
**Vibe:** Readable but assertive.

## 4. The Hybrid Grid Layout

A strict 3-column structure divided by thick black borders (3px solid #000).

### Zone A: The Navigation Rail (Left)
-   **Width:** Fixed 88px.
-   **Style:** Solid Void Black background.
-   **Content:** Vertical stack of square icons.
-   **Interaction:**
    -   *Inactive:* White icon (opacity-50).
    -   *Active/Hover:* Background turns Acid Lime (`#CCFF00`), Icon turns Black. The square shifts 2px down/right (Tactile press).

### Zone B: The Command Center (Center)
-   **Width:** 45% (Flexible).
-   **Style:** Stark White background with a thick black border on the right.
-   **Header:** Scrolling Marquee Bar (Yellow background, Black text).
    -   *Copy:* "/// AGENT STATUS: ONLINE /// GAS: 15 GWEI /// LI.FI BRIDGE: ACTIVE ///"
-   **Body:** Scrollable chat feed.
-   **Footer:** Massive "Terminal" input anchored to the bottom.

### Zone C: The Execution Deck (Right)
-   **Width:** Remaining space (Flexible).
-   **Style:** Paper Cream (`#FAF9F6`) background with a subtle "Dot Grid" pattern (opacity-10).
-   **Content:** The "Stage." Holds the Transaction Receipt and the massive CONFIRM Button.

## 5. UI/UX Trends Integration (2026)

-   **Cyber Gradients & CRT Effects:** Subtle use of noise textures or scanlines on "Void Black" backgrounds to give depth without losing the brutalist flat feel.
-   **Micro-Interactions:** Every hover triggers a translation (movement). Nothing is static.
-   **Status Indicators:** Live, blinking indicators for "Agent Status" to mimic server room hardware.
