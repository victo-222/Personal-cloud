Icon wrapper usage

Use `src/components/ui/Icon.tsx` to render brand icons consistently.

Example:

- Import a brand icon from `react-simple-icons`:

  ```tsx
  import { Github } from 'react-simple-icons'
  import Icon from '@/components/ui/Icon'

  <Icon icon={Github} size={20} className="text-primary" />
  ```

- The `Icon` wrapper accepts:
  - `icon`: the SVG React component (from `react-simple-icons`)
  - `size`: number (px) — sets `width` and `height`
  - `className`: tailwind classes for color/spacing
  - `color`: inline color string to override `currentColor`

Recommendation: prefer `react-simple-icons` for brand icons (keeps licensing and visuals consistent).