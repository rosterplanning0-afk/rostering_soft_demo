# UI/UX Pro Max - Design Intelligence

## Overview
Comprehensive design guide for web and mobile applications. Contains 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 technology stacks.

## When to Apply

**Must Use:**
- Designing new pages (Landing Page, Dashboard, Admin, SaaS, Mobile App)
- Creating or refactoring UI components
- Choosing color schemes, typography, spacing, or layout systems
- Reviewing UI code for UX, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior
- Making product-level design decisions

**Recommended:**
- UI looks "not professional enough"
- Receiving usability feedback
- Pre-launch UI optimization
- Cross-platform alignment

**Skip:**
- Pure backend logic development
- API or database design
- Performance optimization unrelated to interface

## Rule Categories by Priority

| Priority | Category | Impact | Domain | Key Checks | Anti-Patterns |
|----------|----------|--------|--------|------------|---------------|
| 1 | Accessibility | CRITICAL | ux | Contrast 4.5:1, Alt text, Keyboard nav | Removing focus rings |
| 2 | Touch & Interaction | CRITICAL | ux | Min 44×44px, 8px+ spacing, Loading feedback | Hover-only reliance |
| 3 | Performance | HIGH | ux | WebP/AVIF, Lazy loading, CLS < 0.1 | Layout thrashing |
| 4 | Style Selection | HIGH | style | Match product type, SVG icons | Emoji as icons |
| 5 | Layout & Responsive | HIGH | ux | Mobile-first, Viewport meta | Horizontal scroll |
| 6 | Typography & Color | MEDIUM | typography, color | Base 16px, Semantic tokens | Text < 12px |
| 7 | Animation | MEDIUM | ux | 150–300ms, Motion meaning | Decorative-only |
| 8 | Forms & Feedback | MEDIUM | ux | Visible labels, Error near field | Placeholder-only |
| 9 | Navigation Patterns | HIGH | ux | Predictable back, Bottom nav ≤5 | Overloaded nav |
| 10 | Charts & Data | LOW | chart | Legends, Tooltips | Color-only meaning |

## Quick Reference

### 1. Accessibility (CRITICAL)
- `color-contrast` - Minimum 4.5:1 ratio (large text 3:1)
- `focus-states` - Visible focus rings (2–4px)
- `alt-text` - Descriptive alt text for meaningful images
- `aria-labels` - aria-label for icon-only buttons
- `keyboard-nav` - Tab order matches visual order
- `reduced-motion` - Respect prefers-reduced-motion
- `dynamic-type` - Support system text scaling

### 2. Touch & Interaction (CRITICAL)
- `touch-target-size` - Min 44×44pt (iOS) / 48×48dp (Android)
- `touch-spacing` - Minimum 8px gap between touch targets
- `loading-buttons` - Disable button during async operations
- `press-feedback` - Visual feedback on press (ripple/highlight)
- `tap-delay` - Use touch-action: manipulation

### 3. Performance (HIGH)
- `image-optimization` - Use WebP/AVIF, responsive images
- `image-dimension` - Declare width/height to prevent layout shift
- `lazy-loading` - Lazy load non-critical assets
- `bundle-splitting` - Split code by route/feature
- `content-jumping` - Reserve space for async content

### 4. Style Selection (HIGH)
- `style-match` - Match style to product type
- `no-emoji-icons` - Use SVG icons (Heroicons, Lucide)
- `elevation-consistent` - Consistent shadow scale
- `dark-mode-pairing` - Design light/dark variants together

### 5. Layout & Responsive (HIGH)
- `viewport-meta` - width=device-width initial-scale=1
- `mobile-first` - Design mobile-first, scale up
- `spacing-scale` - Use 4pt/8dp incremental spacing
- `container-width` - Consistent max-width on desktop

### 6. Typography & Color (MEDIUM)
- `line-height` - Use 1.5-1.75 for body text
- `font-scale` - Consistent type scale
- `color-semantic` - Define semantic color tokens
- `contrast-readability` - Darker text on light backgrounds

### 7. Animation (MEDIUM)
- `duration-timing` - 150–300ms for micro-interactions
- `transform-performance` - Use transform/opacity only
- `easing` - Use ease-out for entering, ease-in for exiting
- `reduced-motion` - Respect prefers-reduced-motion

### 8. Forms & Feedback (MEDIUM)
- `input-labels` - Visible label per input
- `error-placement` - Show error below related field
- `inline-validation` - Validate on blur, not keystroke
- `progressive-disclosure` - Don't overwhelm upfront

### 9. Navigation Patterns (HIGH)
- `bottom-nav-limit` - Max 5 items with labels
- `back-behavior` - Predictable and consistent
- `deep-linking` - All key screens reachable via URL
- `nav-state-active` - Current location visually highlighted

### 10. Charts & Data (LOW)
- `chart-type` - Match chart to data type
- `legend-visible` - Always show legend
- `tooltip-on-interact` - Show exact values on hover/tap
- `empty-data-state` - Show meaningful empty state

## How to Use

### Step 1: Analyze Requirements
- Product type: Entertainment, Tool, Productivity, or hybrid
- Target audience: C-end consumers
- Style keywords: playful, minimal, dark mode, etc.
- Stack: React Native

### Step 2: Generate Design System (REQUIRED)
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

### Step 2b: Persist Design System
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

### Step 3: Detailed Searches
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain>
```

### Step 4: Stack Guidelines
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react-native
```

## Search Reference

| Domain | Use For | Example |
|--------|---------|---------|
| `product` | Product type recommendations | SaaS, e-commerce, healthcare |
| `style` | UI styles, effects | glassmorphism, minimalism |
| `color` | Color palettes | SaaS, fintech, beauty |
| `typography` | Font pairings | elegant, playful |
| `ux` | Best practices | animation, accessibility |
| `chart` | Chart types | trend, comparison |
| `react` | React performance | memo, rerender |

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis as icons (use SVG)
- [ ] Consistent icon family and style
- [ ] Pressed-state visuals stable
- [ ] Semantic theme tokens used

### Interaction
- [ ] Pressed feedback (150-300ms)
- [ ] Touch targets ≥44x44pt
- [ ] Disabled states clear
- [ ] Screen reader focus order correct

### Light/Dark Mode
- [ ] Text contrast ≥4.5:1 both modes
- [ ] Dividers visible both modes
- [ ] Modal scrim 40-60% opacity

### Layout
- [ ] Safe areas respected
- [ ] Scroll content not hidden
- [ ] 4/8dp spacing rhythm
- [ ] Verified on multiple devices

### Accessibility
- [ ] Meaningful images have labels
- [ ] Form fields have labels/hints/errors
- [ ] Color not only indicator
- [ ] Reduced motion supported