# Modern UI - Quick Reference Guide

## Quick Start

### Using Glass Cards
```tsx
<div className="glass-card p-6">
  {/* Your content */}
</div>
```

### Using Animations
```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ y: -5 }}
  className="glass-card"
>
  {/* Content */}
</motion.div>
```

### Status Badges
```tsx
<span className="status-badge status-active">Active</span>
<span className="status-badge status-pending">Pending</span>
<span className="status-badge status-ended">Ended</span>
```

### Live Indicators
```tsx
<div className="live-indicator">
  <span className="live-dot" />
  <span>Live</span>
</div>
```

## Common Patterns

### Stat Card
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  whileHover={{ y: -6 }}
  className="glass-card p-6 cursor-pointer group"
>
  <div className="flex items-center justify-between mb-3">
    <p className="text-muted-foreground text-sm">Label</p>
    <Icon className="w-4 h-4 text-primary" />
  </div>
  <p className="text-4xl font-bold text-primary">123</p>
</motion.div>
```

### Interactive Button
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="glass-button"
>
  Click Me
</motion.button>
```

### Hover Lift Card
```tsx
<motion.div
  whileHover={{ y: -8 }}
  className="glass-card card-hover-lift"
>
  {/* Content */}
</motion.div>
```

## Animation Variants

### Container Variants
```tsx
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.1,
      duration: 0.5,
      type: "spring",
      stiffness: 100,
    },
  },
};
```

### Hover Variants
```tsx
const hoverVariants = {
  hover: {
    y: -12,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};
```

## Color Reference

### Status Colors
```
Active:     bg-success/20 text-success border-success/30
Pending:    bg-warning/20 text-warning border-warning/30
Ended:      bg-muted text-muted-foreground border-border
Primary:    bg-primary/20 text-primary border-primary/30
```

### Gradient Classes
```
.gradient-gold-text    /* Gold gradient text */
.gradient-gold-bg      /* Gold gradient background */
.gradient-border       /* Gradient border effect */
```

## Shadow Classes

```
.shadow-premium        /* Large shadow */
.shadow-glow          /* Gold glow shadow */
.shadow-soft          /* Subtle shadow */
.gold-glow            /* Gold glow effect */
```

## Responsive Breakpoints

```
Mobile:   < 768px (md)
Tablet:   768px - 1024px
Desktop:  > 1024px

Usage:
md:flex    /* Flex on medium and up */
lg:col-span-2  /* Column span on large and up */
```

## Theme Variables

### Dark Mode (Default)
```css
--background: 222 30% 6%;
--foreground: 220 15% 92%;
--primary: 43 96% 56%;
--secondary: 222 20% 14%;
--success: 152 69% 45%;
--destructive: 0 72% 51%;
```

### Light Mode
```css
--background: 0 0% 98%;
--foreground: 222 30% 6%;
--primary: 43 96% 40%;
--secondary: 0 0% 92%;
--success: 152 69% 35%;
--destructive: 0 84% 60%;
```

## Common Transitions

### Smooth Transition
```tsx
className="smooth-transition"  /* 300ms */
className="smooth-transition-slow"  /* 500ms */
```

### Hover Effects
```tsx
className="hover:text-primary transition-colors"
className="hover:scale-105 transition-transform"
className="hover:shadow-lg transition-shadow"
```

## Animation Timing

### Standard Durations
- Quick: 0.2s
- Normal: 0.3s
- Slow: 0.5s
- Very Slow: 1s

### Easing Functions
- `ease-out`: Smooth deceleration
- `ease-in`: Smooth acceleration
- `cubic-bezier(0.4, 0, 0.2, 1)`: Material Design

## Framer Motion Tips

### Stagger Children
```tsx
<motion.div
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {items.map((item, i) => (
    <motion.div
      key={i}
      variants={itemVariants}
    >
      {item}
    </motion.div>
  ))}
</motion.div>
```

### Conditional Animations
```tsx
<motion.div
  animate={isHovered ? "hover" : "initial"}
  variants={variants}
>
  {/* Content */}
</motion.div>
```

### Gesture Animations
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  whileFocus={{ outline: "2px solid" }}
>
  Click
</motion.button>
```

## Performance Tips

1. **Use GPU-accelerated properties**
   - `transform` instead of `left/top`
   - `opacity` instead of `visibility`

2. **Avoid layout-triggering properties**
   - Don't animate `width`, `height`, `padding`
   - Use `transform: scale()` instead

3. **Optimize animations**
   - Keep animations under 500ms
   - Use `ease-out` for entrances
   - Use `ease-in` for exits

4. **Reduce motion**
   - Respect `prefers-reduced-motion`
   - Provide static alternatives

## Accessibility Checklist

- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Focus states visible
- [ ] Keyboard navigation works
- [ ] ARIA labels present
- [ ] Semantic HTML used
- [ ] Animations can be disabled
- [ ] Touch targets ≥ 44x44px

## Common Issues & Solutions

### Issue: Animations not smooth
**Solution**: Use `transform` and `opacity` only

### Issue: Glassmorphism not visible
**Solution**: Check `backdrop-filter` support

### Issue: Text hard to read
**Solution**: Increase contrast or add text shadow

### Issue: Mobile layout broken
**Solution**: Check responsive classes and breakpoints

## Useful Resources

- Framer Motion: https://www.framer.com/motion/
- Tailwind CSS: https://tailwindcss.com/
- Shadcn UI: https://ui.shadcn.com/
- CSS Tricks: https://css-tricks.com/

## Component Examples

### Enhanced Auction Card
See: `src/components/AuctionCard.tsx`

### Modern Navbar
See: `src/components/Navbar.tsx`

### Animated Countdown
See: `src/components/CountdownTimer.tsx`

### Dashboard Stats
See: `src/pages/BidderDashboardPage.tsx`

---

**Quick Reference v1.0**  
**Last Updated**: 2024
