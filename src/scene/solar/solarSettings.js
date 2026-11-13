export const FOV = 45;
export const ORBIT_SAMPLES = 192;
export const COMET_SAMPLES = 160;
export const RING_SAMPLES = 128;
export const RING_AU = [1, 2, 5, 10];
export const STAR_COUNT = 900;
export const STAR_RADIUS = 3000;

// Square-root spacing keeps Mercury and Saturn on one screen.
export const COMPRESSION_UNIT = 3;

export const MOON_AU = 0.00257;
// The real Moon orbit is too small to show apart from the Earth. The view uses a larger radius.
export const MOON_DISPLAY_RADIUS = 0.35;
export const MOON_LABEL_MAX_DISTANCE = 10;

// A marker keeps the same screen size at every zoom level.
export const MARKER_SCALE = 0.006;
export const TAIL_LENGTH = 1.6;
export const TAIL_WIDTH_RATIO = 0.12;

export const MIN_DISTANCE = 0.5;
export const MAX_DISTANCE = 600;
export const FOCUS_DISTANCE = { sun: 24, planet: 7, moon: 1.4, comet: 5 };
export const FOCUS_RATE = 8;
export const DRAG_DEGREES_PER_PX = 0.3;
export const ZOOM_STEP = 0.1;
export const PICK_RADIUS_PX = 20;

export const PREVIEW_OPACITY = 0.5;
