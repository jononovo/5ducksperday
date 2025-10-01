# Email Compose Drawer - Adjustable Width with Resize Handle Implementation

## Technical Overview
This implementation adds a draggable resize handle to the email compose drawer that allows users to dynamically adjust the drawer width between 320px and 600px. The feature includes both the width adjustment functionality and a visual resize handle that appears on hover.

## Implementation Details

### State Management
Add the following state variables to track the drawer width and resize status:

```typescript
const [drawerWidth, setDrawerWidth] = useState(400);
const [isResizing, setIsResizing] = useState(false);
```

### Mouse Event Handlers
Implement mouse event handlers to manage the resize interaction:

```typescript
const handleMouseDown = (e: React.MouseEvent) => {
  e.preventDefault();
  setIsResizing(true);
};

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    // Constrain width between 320px and 600px
    const constrainedWidth = Math.max(320, Math.min(600, newWidth));
    setDrawerWidth(constrainedWidth);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  if (isResizing) {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }

  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };
}, [isResizing]);
```

### Drawer Container with Resize Handle
Apply dynamic width to the drawer container and add the resize handle element:

```tsx
<div 
  className={`fixed top-0 right-0 bottom-0 bg-background shadow-xl transition-all ${emailDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
  style={{
    ...(emailDrawerOpen && window.innerWidth >= 768 ? { width: `${drawerWidth}px` } : {}),
    ...(isResizing ? { transition: 'none' } : {})
  }}
>
  {/* Resize Handle - Only show on desktop */}
  {emailDrawerOpen && (
    <div
      onMouseDown={handleMouseDown}
      className="hidden md:block absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 group"
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-12 bg-muted-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )}
  
  <div className="h-full overflow-y-auto" style={{ minWidth: emailDrawerOpen ? '320px' : '0' }}>
    {/* Drawer content goes here */}
  </div>
</div>
```

## Key Implementation Points

### 1. Handle Positioning
- The resize handle container is positioned with `absolute -left-1.5` to extend the draggable area slightly outside the drawer edge
- The visual indicator is positioned at `left-1` to stay within the drawer boundaries and avoid clipping issues
- The handle spans the full height of the drawer (`top-0 bottom-0`)

### 2. Visual Indicator
- Width: `w-2` (0.5rem)
- Height: `h-12` (3rem)
- Color: `bg-muted-foreground/40` (40% opacity of the muted foreground color)
- Shape: `rounded-full` for a pill-like appearance
- Visibility: `opacity-0 group-hover:opacity-100` with `transition-opacity` for smooth hover effect
- Centered vertically using `top-1/2 -translate-y-1/2`

### 3. Interaction Area
- The draggable area (`w-3`) is wider than the visual indicator to improve usability
- Cursor changes to `cursor-col-resize` when hovering over the handle
- The `group` class on the parent enables hover effects on the child indicator

### 4. Responsive Design
- Handle is hidden on mobile with `hidden md:block`
- Dynamic width only applies on desktop screens (>= 768px)
- On mobile, the drawer uses its default full-width or fixed-width behavior

### 5. Performance Optimizations
- Transitions are disabled during active resizing to prevent lag
- `userSelect: 'none'` prevents text selection while dragging
- Width constraints (320px-600px) prevent extreme drawer sizes

## Usage Notes
- The drawer must have a state variable `emailDrawerOpen` to control visibility
- The resize handle only appears when the drawer is open
- The implementation assumes a right-side drawer (adjustments needed for left-side drawers)
- The `muted-foreground` color should be defined in your Tailwind CSS theme configuration