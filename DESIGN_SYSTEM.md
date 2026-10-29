# Flow Board Design System

This describes how Flow Board looks today: its colours, type, spacing, and the two building blocks the whole board is made of, cards and columns.

**Source:** written from the app's stylesheet (`src/index.css`) on 29 October 2026. The Figma file "FlowBoard Designs (JD)" couldn't be read because the Figma account connected here doesn't have access to it. Once it's shared, this document should be checked against it. The last section lists the places where differences are most likely.

Sizes are given in pixels, assuming the browser's default text size of 16px. If someone enlarges their browser text, everything scales up together.

---

## 1. Colour

The palette follows the Quadra brand: a deep navy, a bright cyan, a warm cream, and a confident blue for actions. Every colour has a light-theme and a dark-theme value. People switch between them with the sun/moon toggle in the header; until they choose, the app follows their device's setting.

### Brand colours (the same in both themes)

| Name | Hex | Where it appears |
|---|---|---|
| Navy | #04182A | The header bar, the sign-in background, the Undo toast, and body text in the light theme |
| Cyan | #53B3E7 | The thin stripe under the header, the top edge of dialogs and the sign-in card, the Undo link, and focus outlines in the dark theme |
| Cream | #F7F4F2 | The page background in the light theme, text on navy, and the sliding thumb of the theme toggle |

### Interface colours

| Role | Light theme | Dark theme | What it's for |
|---|---|---|---|
| Page background | #F7F4F2 (cream) | #020F1B | Behind everything |
| Surface | #FFFFFF | #0F2538 | Cards, dialogs, menus, the sign-in card |
| Column base | #ECE8E4 | #081D30 | The base each column's tint is mixed into; also the hover highlight on small buttons and menu items |
| Text | #04182A (navy) | #F7F4F2 (cream) | Headings and body text |
| Secondary text | #4A5561 | #9AA6B2 | Field labels, card details, counts, empty-column messages |
| Divider | #D9DCDF | #2A3B4A | Button outlines, menu dividers, the dashed outline of empty columns |
| Input border | #7D8791 | #6B7D8F | Outlines of text boxes and dropdowns. Deliberately darker than the divider so fields are easy to see |
| Primary (actions) | #295EC6 | #3A6FD8 | The main button ("Add card", "Sign in", "Save changes") and letter avatars |
| Primary, hovered | #1F4BA3 | #2F62C9 | The main button when hovered |
| Danger | #CF3621 | #EC7462 | Delete buttons, overdue cards, error messages |
| Focus outline | #295EC6 (primary blue) | #53B3E7 (cyan) | The outline that shows where keyboard focus is |
| Icons | #4A4A4A | #B8BCC2 | The picture-style assignee icons |

### Priority colours

Each priority has a base hue. Labels are never drawn in the raw hue. The text is mixed toward the text colour so it stays readable, and the background is a faint wash of the hue.

| Priority | Base hue | Label text (light / dark) | Label background on a card (light / dark) |
|---|---|---|---|
| High | Orange #E48047 | #8A563B / #ECAE8B | #FBEDE5 / #2D323A |
| Medium | Periwinkle #ACB7FA | #506088 / #D5D9F6 | #F0F2FE / #2B3F5B |
| Low | Green #59A88F | #376E67 / #98C6B7 | #E1EFEB / #1C3D48 |

The column accent colours are listed under **Columns** below.

### Colour rules

- **Readable text everywhere.** All text meets the WCAG AA minimum of 4.5 to 1 against what's behind it, in both themes. Focus outlines and input borders meet at least 3 to 1. The project's automated tests recalculate these ratios from the stylesheet, so a colour change that breaks them fails the build.
- **Never colour alone.** Priority is always written out ("HIGH"), and overdue cards say "Overdue" as well as turning red.
- **Red text is softened toward the text colour** wherever it sits on a tinted background (error banner, overdue date, "Clear completed" on hover), because pure red isn't readable enough there.
- **Brand moments stay navy in both themes:** the header, the sign-in background and the Undo toast.

---

## 2. Typography

**Typeface:** Inter Tight, a compact, modern sans-serif. It's bundled with the app rather than loaded from Google, so it works offline and doesn't contact third parties. If it fails to load, the device's own interface font is used instead (Segoe UI on Windows, San Francisco on Apple devices).

**Weights used:** Regular (400), Semibold (600) and Bold (700).

### Type scale

| Size | Weight | Used for |
|---|---|---|
| 25.6px | Semibold, slightly tightened | "Flow Board" on the sign-in card |
| 20px | Semibold, slightly tightened | "Flow Board" in the header |
| 18.4px | Bold | Dialog titles ("New card", "Edit card") |
| 16px | Regular | Default text, form fields and buttons |
| 16px | Semibold | Button labels |
| 15.2px | Semibold | Card titles |
| 14.4px | Regular | Toast messages, error banners, the sign-in subtitle |
| 14px | Regular | Move-menu options |
| 13.6px | Semibold, ALL CAPS, widely spaced | Column names |
| 13.6px | Regular | Field labels, empty-column messages, your email in the header |
| 12.8px | Regular | Card details (assignee and due date), the search result count |
| 12.8px | Semibold | Column card counts |
| 12px | Semibold | The "Clear completed" link |
| 11.2px | Bold, ALL CAPS, lightly spaced | Priority labels |
| 11.2px | Semibold, ALL CAPS, widely spaced | The "Move to" heading inside the Move menu |
| 11.2px | Semibold | The initial inside a letter avatar |

### Type rules

- **Headings are slightly tightened** (letters about 1% closer than normal).
- **Small all-caps labels are widely spaced** (column names and the "Move to" heading at 6%, priority labels at 4%), which keeps tiny capitals legible.
- **Long text wraps rather than being cut off** with "…". This applies to card titles, assignee names and toast messages, so nothing is lost when someone zooms in. The one exception is your email address in the header, which is shortened when space runs out and hidden on phones.
- **"No due date" is shown in italics** rather than faded, because fading made it too faint to read.

---

## 3. Spacing, shape and depth

### Spacing

Spacing loosely follows steps of 4px, with a few in-between values.

| Space | Where |
|---|---|
| 2px | Between a card's small action buttons |
| 4px | Between a field's label and its box |
| 6px | Between a card's top row and its title; between an avatar and the name |
| 8px | Between cards in a column; between header buttons; between a column's name and its count |
| 10px × 12px | Inside a card (top and bottom × sides) |
| 12px | Inside a column; below a column header; between side-by-side form fields |
| 14px | Between form fields in dialogs and on the sign-in card |
| 16px | Between columns; the page edge on phones |
| 24px | The page edge on larger screens; inside dialogs |
| 32px | Inside the sign-in card |

### Corner rounding

| Rounding | Used for |
|---|---|
| Fully round | Buttons, the search box, priority labels, count badges, the theme toggle |
| 10px (standard) | Cards, columns, dialogs, menus, the toast, the error banner, the sign-in card |
| 8px | Text boxes and dropdowns in forms |
| 6px | Options inside the Move menu |
| 4px | Small icon buttons and the clickable card title |
| Circle | Letter avatars |

### Depth (shadows)

| Level | Look | Used for |
|---|---|---|
| Resting | A very soft, close shadow (in the dark theme, a single short dark shadow) | Cards |
| Floating | A medium, diffused shadow | The Move menu and the Undo toast |
| Overlay | A large, soft shadow | Dialogs and the sign-in card |

Dialogs also dim the page behind them with navy at 60% opacity.

### Layout

- **Larger screens:** five columns sit side by side. Each is at least 240px wide, and they share the available width equally. If the window is too narrow, the board scrolls sideways.
- **Phones (640px wide or less):** the columns stack top to bottom at full width, so the page only scrolls up and down. The header wraps, with the search box moving onto its own row.

---

## 4. Columns

A column is a tinted panel holding a header and a stack of cards. There are five, always in this order.

### Anatomy

1. **Accent stripe:** a 3px band of the column's accent colour along the top edge.
2. **Header row:** the column name in small, spaced-out capitals; a rounded count badge (screen readers hear it as, for example, "3 cards"); and in Done only, a small "Clear completed" text button at the far right.
3. **Card stack:** cards stacked with 8px between them.
4. **Empty state:** when a column has no cards, a box with a dashed outline and centred secondary text. It reads "Drop cards here" normally, "No matching cards" while a search is filtering, and "Loading cards…" before the board has loaded.

### Accent colours

Each column has its own accent. The panel background is a light wash of it (12% mixed into the column base colour), and the count badge is a stronger wash (28% mixed into the surface colour).

| Column | Accent | Panel tint (light / dark) | Count badge (light / dark) |
|---|---|---|---|
| Backlog | Slate blue #5D6E9C | #DBD9DB / #12273D | #D2D6E3 / #253954 |
| In Progress | Brand blue #295EC6 | #D5D7E0 / #0C2542 | #C3D2EF / #163560 |
| In Review | Orange #E48047 | #EBDCD1 / #222933 | #F7DBCB / #4B3E3C |
| On Hold | Amber #E8B744 | #ECE2D1 / #232F32 | #F9EBCB / #4C4E3B |
| Done | Green #59A88F | #DAE0DA / #122E3B | #D1E7E0 / #244A50 |

The accent stripes are decorative: each column's name is always written out, so nobody has to rely on the colour.

### States

| State | Appearance |
|---|---|
| Default | Accent stripe, tinted panel, 12px inner padding, at least 200px tall on larger screens |
| A card is dragged over it | The tint deepens (to a 28% wash) and a dashed outline in the accent colour appears inside the edge |
| "Clear completed" hovered or focused | The link turns a softened red with a faint red wash behind it |
| On phones | The minimum height is removed, so empty columns stay compact once stacked |

### Behaviour

- **"Clear completed"** only removes your own Done cards, and it's hidden when you have none. A toast then offers Undo.
- **For screen readers,** each column is a labelled region named after its heading, so people can jump between columns.

---

## 5. Cards

A card is a white (light theme) or deep blue (dark theme) tile with rounded corners and a soft resting shadow. It has three rows.

### Anatomy

1. **Top row:**
   - **Left:** the priority label, a small rounded pill such as "HIGH".
   - **Right:** up to three small 26px icon buttons. **Move** (four-way arrows) opens a menu to send the card up, down, or to another column. **Edit** (pencil) opens the full editing dialog. **Delete** (bin) only appears on cards you created.
2. **Title:** semibold, wrapping onto as many lines as it needs. Clicking it turns it into a text box for a quick rename. For screen readers it's described as "Press to rename".
3. **Details row:**
   - **Left:** the assignee, an avatar followed by their name.
   - **Right:** the due date, written like "Nov 3, 2026".

### Assignee avatars

- **By default:** a blue circle (22px) with the person's first initial in white.
- **When the name contains certain words** (dog, bunny, money, captain or cat), a matching line drawing (26px, in the icon colour) replaces the circle.

### States

| State | Appearance |
|---|---|
| Default | Surface colour, soft shadow, 10px × 12px padding. The cursor shows a grab hand |
| Hovered or focused | Move and Edit fade in; Delete is always visible. Touch screens always show all three |
| Being dragged | The card fades to 40% opacity |
| Overdue (due date passed and not in Done) | A 4px red bar down the left edge, a faint red wash over the card, and the date reads "Overdue · Nov 3, 2026" in bold softened red |
| No due date | "No due date" in italics |
| Title being renamed | The title becomes a text box with a blue outline. Enter saves, Escape cancels |
| A teammate's card | Same look, but no Delete button. Anyone on the team can still move and edit it |

### The Move menu

The Move menu opens just below the Move button, or above it if there isn't room. It's a small floating panel at least 170px wide:
- "Move up" and "Move down", greyed out at the top or bottom of the column
- a divider
- a small "MOVE TO" heading
- one option for each of the other columns

It closes with Escape or a click outside, and keyboard focus returns to the card afterwards.

---

## 6. Other components (in brief)

- **Buttons:**
  - **Standard:** fully rounded, with a thin divider-coloured outline and a semibold label.
  - **Primary:** solid blue with white text.
  - **Danger:** red text and outline.
  - **In the header:** transparent with a faint cream outline.
- **Text boxes and dropdowns:** 8px rounding, a clearly visible input border, and the page background colour inside. The search box is the same but fully rounded.
- **Focus outline:** every interactive element shows a 2px outline in the focus colour when reached by keyboard (cyan on the navy header).
- **Dialogs:** a surface-coloured panel up to 440px wide, with a 4px cyan top edge, 24px padding, and the action buttons right-aligned at the bottom (Delete, when present, sits alone on the left).
- **Undo toast:** a navy panel centred near the bottom of the screen, up to 560px wide. It has cream text, a bold cyan "Undo" and a ✕ to dismiss, and slides up gently when it appears. It stays for 6 seconds, and the countdown pauses while the pointer is over it or keyboard focus is inside it.
- **Theme toggle:** a small rounded switch showing a sun and a moon, with a cream thumb that slides behind the active one.
- **Small targets:** nothing clickable is smaller than 24px, and most small controls are 26px or larger.
- **Motion:** brief fades of 120–180ms. All motion is switched off for people whose device is set to reduce motion.

---

## 7. To check against the Figma file

When the Figma designs are available, these are the most likely places for differences, and the decisions worth making:

1. **Font sizes cluster closely.** 14.4px, 14px, 13.6px and 12.8px are nearly the same size. A tidier scale (for example 14px and 12px) would be easier to design with.
2. **Spacing doesn't strictly follow a grid.** Values like 6, 10, 14 and 18px sit between the 4px steps, and form fields use 9px and 11px. Check whether Figma uses a strict 4px or 8px grid.
3. **Two ways of saying "fully round"** are used in the code. They look identical, but should be one value.
4. **An unused colour, "Navy 85%" (#2A3B4A),** is defined in light mode but not used anywhere. The same hex is used as the dark-theme divider.
5. **Assignee icons are grey, not blue.** A note in the stylesheet says they should be "brand blue", but they use the grey icon colour. One or the other should be corrected.
6. **No line height is set,** so text uses the browser's default spacing between lines. Figma will specify one.
7. **The dark theme** may not exist in Figma at all, in which case these dark values are the reference.
