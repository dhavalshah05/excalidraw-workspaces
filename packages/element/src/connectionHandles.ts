import { pointFrom, pointRotateRads } from "@excalidraw/math";

import type { GlobalPoint } from "@excalidraw/math";

import type { Zoom } from "@excalidraw/excalidraw/types";

import { getElementAbsoluteCoords } from "./bounds";
import { isFlowchartNodeElement } from "./typeChecks";

import type { Bounds } from "./bounds";

import type {
  ElementsMap,
  ExcalidrawElement,
  ExcalidrawFlowchartNodeElement,
} from "./types";

export type ConnectionHandleDirection = "n" | "e" | "s" | "w";

export type ConnectionHandle = {
  direction: ConnectionHandleDirection;
  point: GlobalPoint;
  bounds: Bounds;
  hitBounds: Bounds;
};

export type ConnectionHandles = Record<
  ConnectionHandleDirection,
  ConnectionHandle
>;

const VISUAL_SIZE = 12;
const HIT_SIZE = 16;
// Keeps connection handles clear of resize and rotation handles.
const HANDLE_OFFSET = 38;

const createBounds = (point: GlobalPoint, size: number): Bounds => [
  point[0] - size / 2,
  point[1] - size / 2,
  size,
  size,
];

const createHandle = (
  direction: ConnectionHandleDirection,
  point: GlobalPoint,
  zoom: Zoom,
): ConnectionHandle => ({
  direction,
  point,
  bounds: createBounds(point, VISUAL_SIZE / zoom.value),
  hitBounds: createBounds(point, HIT_SIZE / zoom.value),
});

export const getConnectionHandles = (
  element: ExcalidrawElement,
  zoom: Zoom,
  elementsMap: ElementsMap,
): ConnectionHandles => {
  const [x1, y1, x2, y2, cx, cy] = getElementAbsoluteCoords(
    element,
    elementsMap,
    true,
  );
  const center = pointFrom<GlobalPoint>(cx, cy);
  const offset = HANDLE_OFFSET / zoom.value;
  const rotate = (x: number, y: number) =>
    pointRotateRads(pointFrom<GlobalPoint>(x, y), center, element.angle);

  return {
    n: createHandle("n", rotate(cx, y1 - offset), zoom),
    e: createHandle("e", rotate(x2 + offset, cy), zoom),
    s: createHandle("s", rotate(cx, y2 + offset), zoom),
    w: createHandle("w", rotate(x1 - offset, cy), zoom),
  };
};

const isPointInBounds = (point: GlobalPoint, bounds: Bounds) => {
  const [x, y, width, height] = bounds;
  return (
    point[0] >= x &&
    point[0] <= x + width &&
    point[1] >= y &&
    point[1] <= y + height
  );
};

export const getConnectionHandleAtPoint = (
  element: ExcalidrawElement,
  point: GlobalPoint,
  zoom: Zoom,
  elementsMap: ElementsMap,
): ConnectionHandle | null => {
  const handles = getConnectionHandles(element, zoom, elementsMap);

  for (const direction of ["n", "e", "s", "w"] as const) {
    if (isPointInBounds(point, handles[direction].hitBounds)) {
      return handles[direction];
    }
  }

  return null;
};

export const canHaveConnectionHandles = (
  element: ExcalidrawElement,
): element is ExcalidrawFlowchartNodeElement =>
  !element.locked && isFlowchartNodeElement(element);
