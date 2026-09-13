import { createElement, type SVGProps } from "react";
import type { ShapeSpec } from "../types";

/** 把后端返回的图形描述渲染为 SVG 元素（属性名为 React 约定的 camelCase） */
export function Shape({ spec }: { spec: ShapeSpec }) {
  const { type, ...attrs } = spec;
  return createElement(type as "circle", attrs as unknown as SVGProps<SVGCircleElement>);
}
