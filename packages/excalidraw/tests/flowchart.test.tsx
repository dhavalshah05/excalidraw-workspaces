import React from "react";

import { KEYS } from "@excalidraw/common";

import type {
  ExcalidrawArrowElement,
  ExcalidrawTextElement,
} from "@excalidraw/element/types";

import { Excalidraw } from "../index";

import { API } from "./helpers/api";
import { Keyboard } from "./helpers/ui";
import { render } from "./test-utils";

const { h } = window;

const createNodeToTheRight = () => {
  Keyboard.keyDown(KEYS.CTRL_OR_CMD);
  Keyboard.withModifierKeys({ ctrl: true }, () => {
    Keyboard.keyDown(KEYS.ARROW_RIGHT);
  });
  Keyboard.keyUp(KEYS.CTRL_OR_CMD);
};

describe("flowchart creation with keyboard", () => {
  beforeEach(async () => {
    await render(<Excalidraw handleKeyboardGlobally />);
  });

  it("creates a linked rectangle from a rectangle", () => {
    const rectangle = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
    API.setElements([rectangle]);
    API.setSelectedElements([rectangle]);

    createNodeToTheRight();

    expect(h.elements.length).toBe(3);
    const newNode = h.elements[1];
    const arrow = h.elements[2] as ExcalidrawArrowElement;
    expect(newNode.type).toBe("rectangle");
    expect(newNode.x).toBeGreaterThan(rectangle.x + rectangle.width);
    expect(arrow.type).toBe("arrow");
    expect(arrow.startBinding?.elementId).toBe(rectangle.id);
    expect(arrow.endBinding?.elementId).toBe(newNode.id);
  });

  it("creates a linked text node with placeholder from a text element", () => {
    const text = API.createElement({
      type: "text",
      x: 0,
      y: 0,
      text: "Hello world",
      fontSize: 28,
      strokeColor: "#e03131",
      opacity: 70,
    });
    API.setElements([text]);
    API.setSelectedElements([text]);

    createNodeToTheRight();

    expect(h.elements.length).toBe(3);
    const newNode = h.elements[1] as ExcalidrawTextElement;
    const arrow = h.elements[2] as ExcalidrawArrowElement;

    expect(newNode.type).toBe("text");
    expect(newNode.text).toBe("Text");
    expect(newNode.originalText).toBe("Text");
    expect(newNode.fontSize).toBe(28);
    expect(newNode.fontFamily).toBe(text.fontFamily);
    expect(newNode.strokeColor).toBe("#e03131");
    expect(newNode.opacity).toBe(70);
    expect(newNode.containerId).toBe(null);
    expect(newNode.x).toBeGreaterThan(text.x + text.width);

    expect(arrow.type).toBe("arrow");
    expect(arrow.startBinding?.elementId).toBe(text.id);
    expect(arrow.endBinding?.elementId).toBe(newNode.id);
    expect(h.state.selectedElementIds[newNode.id]).toBe(true);
  });

  it("does not create a node from text bound inside a container", () => {
    const container = API.createElement({
      type: "rectangle",
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
    const boundText = API.createElement({
      type: "text",
      text: "label",
      containerId: container.id,
    });
    API.setElements([container, boundText]);
    API.setSelectedElements([boundText]);

    createNodeToTheRight();

    expect(h.elements.length).toBe(2);
  });
});
