import React from "react";

import { getConnectionHandles } from "@excalidraw/element";

import type { ExcalidrawArrowElement } from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Pointer } from "./helpers/ui";
import { act, render } from "./test-utils";

const { h } = window;

const mouse = new Pointer("mouse");

const dragFromHandleTo = (
  source: Parameters<typeof getConnectionHandles>[0],
  sourceDirection: keyof ReturnType<typeof getConnectionHandles>,
  dropX: number,
  dropY: number,
) => {
  const elementsMap = h.app.scene.getNonDeletedElementsMap();
  const sourcePoint = getConnectionHandles(source, h.state.zoom, elementsMap)[
    sourceDirection
  ].point;

  mouse.downAt(sourcePoint[0], sourcePoint[1]);
  mouse.moveTo(dropX, dropY);
  mouse.upAt(dropX, dropY);
};

const dragConnection = (
  source: Parameters<typeof getConnectionHandles>[0],
  sourceDirection: keyof ReturnType<typeof getConnectionHandles>,
  target: Parameters<typeof getConnectionHandles>[0],
) => {
  dragFromHandleTo(
    source,
    sourceDirection,
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
};

describe("connection handles", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
    mouse.reset();
  });

  it("creates a bound arrow between two flowchart nodes", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
    const ellipse = API.createElement({
      type: "ellipse",
      x: 300,
      y: 0,
      width: 100,
      height: 80,
    });
    API.setElements([rectangle, ellipse]);
    API.setSelectedElements([rectangle]);
    const undoStackSize = API.getUndoStack().length;

    dragConnection(rectangle, "e", ellipse);

    expect(h.elements).toHaveLength(3);
    expect(API.getUndoStack()).toHaveLength(undoStackSize + 1);
    const arrow = h.elements[2] as ExcalidrawArrowElement;
    expect(arrow.type).toBe("arrow");
    expect(arrow.startBinding?.elementId).toBe(rectangle.id);
    expect(arrow.endBinding?.elementId).toBe(ellipse.id);
  });

  it("keeps the arrow when dropped on the target's edge", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
    const ellipse = API.createElement({
      type: "ellipse",
      x: 300,
      y: 0,
      width: 100,
      height: 80,
    });
    API.setElements([rectangle, ellipse]);
    API.setSelectedElements([rectangle]);

    // left-most point of the ellipse outline
    dragFromHandleTo(rectangle, "e", ellipse.x, ellipse.y + ellipse.height / 2);

    expect(h.elements).toHaveLength(3);
    const arrow = h.elements[2] as ExcalidrawArrowElement;
    expect(arrow.startBinding?.elementId).toBe(rectangle.id);
    expect(arrow.endBinding?.elementId).toBe(ellipse.id);
  });

  it("keeps the arrow when dropped just outside the target within binding distance", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
    const target = API.createElement({
      type: "rectangle",
      x: 300,
      y: 0,
      width: 100,
      height: 80,
    });
    API.setElements([rectangle, target]);
    API.setSelectedElements([rectangle]);

    // a few px left of the target's outline, where the highlight is drawn
    dragFromHandleTo(
      rectangle,
      "e",
      target.x - 4,
      target.y + target.height / 2,
    );

    expect(h.elements).toHaveLength(3);
    const arrow = h.elements[2] as ExcalidrawArrowElement;
    expect(arrow.startBinding?.elementId).toBe(rectangle.id);
    expect(arrow.endBinding?.elementId).toBe(target.id);
  });

  it("supports standalone text", () => {
    const text = API.createElement({
      type: "text",
      x: 0,
      y: 0,
      text: "Source",
      width: 100,
      height: 30,
    });
    const rectangle = API.createElement({
      type: "rectangle",
      x: 300,
      y: 0,
      width: 100,
      height: 80,
    });
    API.setElements([text, rectangle]);
    API.setSelectedElements([text]);

    dragConnection(text, "e", rectangle);

    const arrow = h.elements[2] as ExcalidrawArrowElement;
    expect(arrow.startBinding?.elementId).toBe(text.id);
    expect(arrow.endBinding?.elementId).toBe(rectangle.id);
  });

  it("uses the current arrow style but always creates an elbow arrow", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
    const ellipse = API.createElement({
      type: "ellipse",
      x: 300,
      y: 0,
      width: 100,
      height: 80,
    });
    API.setElements([rectangle, ellipse]);
    API.setSelectedElements([rectangle]);
    act(() => {
      h.setState({
        currentItemStrokeColor: "#e03131",
        currentItemStrokeWidth: 4,
        currentItemEndArrowhead: "triangle",
        currentItemArrowType: "sharp",
      });
    });

    dragConnection(rectangle, "e", ellipse);

    const arrow = h.elements[2] as ExcalidrawArrowElement;
    expect(arrow.strokeColor).toBe("#e03131");
    expect(arrow.strokeWidth).toBe(4);
    expect(arrow.endArrowhead).toBe("triangle");
    expect(arrow.elbowed).toBe(true);
    expect(arrow.roundness).toBeNull();
    expect(arrow.startBinding?.elementId).toBe(rectangle.id);
    expect(arrow.endBinding?.elementId).toBe(ellipse.id);
  });

  it("cancels the arrow when dropped on empty canvas", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
    const ellipse = API.createElement({
      type: "ellipse",
      x: 300,
      y: 0,
      width: 100,
      height: 80,
    });
    API.setElements([rectangle, ellipse]);
    API.setSelectedElements([rectangle]);

    const undoStackSize = API.getUndoStack().length;
    const sourcePoint = getConnectionHandles(
      rectangle,
      h.state.zoom,
      h.app.scene.getNonDeletedElementsMap(),
    ).e.point;
    mouse.downAt(sourcePoint[0], sourcePoint[1]);
    mouse.moveTo(200, 200);
    mouse.upAt(200, 200);

    expect(h.elements).toHaveLength(2);
    expect(h.state.selectedElementIds).toEqual({ [rectangle.id]: true });
    expect(API.getUndoStack()).toHaveLength(undoStackSize);
    expect(
      h.app.scene.getNonDeletedElementsMap().get(rectangle.id)?.boundElements,
    ).toEqual([]);
  });

  it("cancels the arrow when dropped back on the source", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    const handles = getConnectionHandles(
      rectangle,
      h.state.zoom,
      h.app.scene.getNonDeletedElementsMap(),
    );
    mouse.downAt(handles.e.point[0], handles.e.point[1]);
    mouse.moveTo(handles.w.point[0], handles.w.point[1]);
    mouse.upAt(handles.w.point[0], handles.w.point[1]);

    expect(h.elements).toHaveLength(1);
    expect(h.state.selectedElementIds).toEqual({ [rectangle.id]: true });
  });

  it("rotates connection handles with the element", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      angle: Math.PI / 2,
    });
    API.setElements([rectangle]);

    const handles = getConnectionHandles(
      rectangle,
      h.state.zoom,
      h.app.scene.getNonDeletedElementsMap(),
    );

    expect(handles.e.point[0]).toBeCloseTo(50);
    expect(handles.e.point[1]).toBeCloseTo(128);
    expect(handles.n.point[0]).toBeCloseTo(128);
    expect(handles.n.point[1]).toBeCloseTo(40);
  });
});
