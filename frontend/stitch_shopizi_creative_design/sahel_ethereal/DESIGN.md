---
name: Sahel Ethereal
colors:
  surface: '#fbf9f4'
  surface-dim: '#dbdad5'
  surface-bright: '#fbf9f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ee'
  surface-container: '#f0eee9'
  surface-container-high: '#eae8e3'
  surface-container-highest: '#e4e2dd'
  on-surface: '#1b1c19'
  on-surface-variant: '#3e4a3e'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ec'
  outline: '#6d7a6d'
  outline-variant: '#bdcaba'
  surface-tint: '#006d30'
  primary: '#006b2f'
  on-primary: '#ffffff'
  primary-container: '#00873d'
  on-primary-container: '#f7fff3'
  inverse-primary: '#60df81'
  secondary: '#7c5800'
  on-secondary: '#ffffff'
  secondary-container: '#ffbb16'
  on-secondary-container: '#6c4d00'
  tertiary: '#bb0014'
  on-tertiary: '#ffffff'
  tertiary-container: '#e32126'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#7efc9a'
  primary-fixed-dim: '#60df81'
  on-primary-fixed: '#00210a'
  on-primary-fixed-variant: '#005323'
  secondary-fixed: '#ffdea6'
  secondary-fixed-dim: '#ffbb16'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4200'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ac'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000d'
  background: '#fbf9f4'
  on-background: '#1b1c19'
  surface-variant: '#e4e2dd'
  surface-off-white: '#F9F7F2'
  burkina-green-deep: '#007A38'
  burkina-green-light: '#E6F5ED'
  saffron-glow: '#FFF8E6'
  text-main: '#1A1C19'
  text-muted: '#5C5F5A'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  baseline: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2.5rem
  xl: 4rem
  gutter: 1.5rem
  container-max: 1280px
---

## Brand & Style

The design system is a high-performance SaaS ecosystem designed for the modern Burkinabé merchant. It bridges the gap between traditional West African commerce and global digital standards. The brand personality is **vibrant, authentic, and creative**, projecting an image of a "Top-Tier Local Partner" that is both world-class and deeply rooted in its culture.

The visual direction follows a **Modern Corporate** style with **Airy Minimalism**. It prioritizes extreme legibility and high-quality whitespace to reduce cognitive load for business owners managing complex inventories. To maintain cultural authenticity, subtle geometric patterns inspired by *Faso Dan Fani* textiles are utilized as low-opacity decorative accents in container backgrounds and sidebar footers, providing a distinctive "Shopizi" thumbprint without distracting from data.

The emotional response should be one of **trust and empowerment**. The UI feels "expensive" yet accessible, using soft shadows and large radii to evoke a friendly, welcoming environment for entrepreneurs at any stage of their journey.

## Colors

The palette is centered around **Burkina Green** (#009E49), representing growth and professional vitality. This is used for primary actions, navigation states, and success indicators. **Golden Saffron** (#FDB913) serves as the high-energy action color, reserved for critical "Call to Action" buttons and conversion points like "Publish Shop" or "Upgrade Now."

The background utilizes a warm **Off-White** (#F9F7F2) instead of pure white to soften the "Airy" feel and prevent screen fatigue. We include a tertiary **Burkina Red** (#EF2B2D) strictly for destructive actions, errors, and urgent system alerts.

**Color Usage Guidelines:**
- **Primary Green:** Sidebar icons, primary headers, and positive progress bars.
- **Golden Saffron:** Primary buttons and "Upgrade" prompts.
- **Surface Off-White:** Main application canvas.
- **Faso Accents:** Use the secondary/primary colors at 5-10% opacity for geometric background patterns.

## Typography

This design system uses **Plus Jakarta Sans** across all levels. Its contemporary, slightly rounded geometric forms mirror the "Airy" and "Friendly" brand personality while maintaining the precision required for a financial/SaaS dashboard.

**Hierarchy Rules:**
- **Headlines:** Use Bold (700) for page titles and Semibold (600) for section headers. Apply a slight negative letter-spacing (-0.02em) on large headlines to maintain a tight, premium feel.
- **Body:** Regular (400) is the standard for data entry and descriptions. Use a generous line-height (1.5x) to ensure readability for merchants on various device qualities.
- **Labels:** Use Semibold (600) for button text and Medium (500) for form labels and metadata. Small labels (`label-sm`) should use uppercase for category tags or table headers.

## Layout & Spacing

The system employs a **Fluid Grid** model with high-margin "Safe Zones" to create the requested airy feel. 

- **Desktop (1280px+):** 12-column grid, 24px gutters, 40px side margins.
- **Tablet (768px - 1279px):** 8-column grid, 16px gutters, 24px side margins.
- **Mobile (<768px):** 4-column grid, 16px gutters, 16px side margins.

**Rhythm:**
Spacing follows a 4px baseline. Components like cards and sections should prioritize `lg` (40px) or `xl` (64px) vertical spacing between major groups to maintain the premium, uncluttered aesthetic. Dashboard widgets should use `md` (24px) padding internally.

## Elevation & Depth

Depth is conveyed through **Tonal Layers** combined with **Ambient Shadows**. This avoids the "flat" look and provides a tactile, trustworthy feel.

- **Level 0 (Base):** Off-white surface.
- **Level 1 (Cards/Sidebar):** White surface with a very soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.04)`.
- **Level 2 (Dropdowns/Modals):** White surface with a more pronounced shadow: `0px 10px 32px rgba(0, 0, 0, 0.08)`.
- **Interactive Depth:** Buttons use a subtle "lift" on hover, increasing shadow spread, while "pressed" states remove the shadow and slightly darken the background to simulate physical compression.

## Shapes

The design system utilizes **Rounded (2)** logic to ensure a friendly and approachable interface. 

- **Standard Elements:** 0.5rem (8px) for input fields, buttons, and small cards.
- **Large Elements:** 1rem (16px) for main dashboard widgets and containers.
- **Special Elements:** 1.5rem (24px) or full pill-shape for status badges (e.g., "In Stock") and specific "Upgrade" floating action buttons.

Avoid sharp 0px corners entirely to maintain the "Soft" and "Premium" visual promise.

## Components

### Buttons
- **Primary:** Golden Saffron background, dark text (`text-main`), rounded-md. High prominence.
- **Secondary:** Burkina Green background, white text. Used for standard navigation actions.
- **Ghost:** No background, Burkina Green border or text. Used for secondary dashboard actions.

### Cards
Cards are the primary container for products and stats. They must be pure white, use `rounded-lg` (16px), and feature a Level 1 shadow. For "Shop Stats," cards should include a 4px left-border of Burkina Green to denote active status.

### Input Fields
Inputs use a white background with a 1px border (`#E0E0E0`). On focus, the border transitions to Burkina Green (2px) with a soft green outer glow. Labels always sit above the field in `label-lg`.

### Navigation Sidebar
The sidebar is a clean white surface (Level 1). Active states use a "Pill" background of `burkina-green-light` with `burkina-green-deep` text and icons. The bottom of the sidebar features a subtle Faso Dan Fani pattern at 5% opacity.

### Progress & Limits
A critical component for Shopizi. Use "Progress Tracks" (thin horizontal bars). 
- **Under 80%:** Burkina Green.
- **80-99%:** Golden Saffron.
- **100%:** Burkina Red with an "Upgrade" CTA appearing adjacent.

### Status Chips
Pill-shaped with low-opacity backgrounds:
- `Confirmed`: Green text / Light Green bg.
- `Pending`: Saffron text / Saffron bg.
- `Cancelled`: Red text / Red bg.