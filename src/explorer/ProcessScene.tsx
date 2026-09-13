import { createElement, type SVGProps } from "react";
import type { EntityState, ProcessDetail, ShapeSpec } from "../types";
import type { SceneState } from "./processEngine";

interface ProcessSceneProps {
  process: ProcessDetail;
  scene: SceneState;
  activeOrganelleId: string | null;
  onInspectOrganelle: (organelleId: string) => void;
}

type ShapeProps = SVGProps<SVGElement> & Record<string, unknown>;

/** 渲染单个 SVG 图形：支持 text 的 children，以及关键帧驱动的 dashOffset */
function SceneShape({ spec, dashOffset }: { spec: ShapeSpec; dashOffset: number | null }) {
  const { type, children, ...attrs } = spec as ShapeSpec & { children?: string };
  const props: ShapeProps = { ...attrs };
  if (dashOffset !== null) props.strokeDashoffset = dashOffset;
  if (type === "text" && typeof children === "string") {
    return createElement("text", props as SVGProps<SVGTextElement>, children);
  }
  return createElement(type as "circle", props as SVGProps<SVGCircleElement>);
}

export default function ProcessScene({ process, scene, activeOrganelleId, onInspectOrganelle }: ProcessSceneProps) {
  const vb = process.sceneViewBox;

  return (
    <svg
      className="process-svg"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      role="img"
      aria-label={`${process.name}动态模拟场景`}
    >
      {scene.entities.map((entity: EntityState) => {
        const interactive = Boolean(entity.organelleId);
        const isNote = entity.kind === "note" || entity.kind === "zone";
        const isActive = Boolean(entity.organelleId && entity.organelleId === activeOrganelleId);
        const classes = [
          "scene-entity",
          `kind-${entity.kind}`,
          interactive ? "is-clickable" : "",
          isActive ? "is-active-organelle" : "",
          isNote ? "is-decor" : ""
        ]
          .filter(Boolean)
          .join(" ");

        // 未设置的变换属性（null）不写入 transform：使用绝对坐标的静态实体保持原位
        const parts: string[] = [];
        if (entity.x !== null && entity.y !== null) parts.push(`translate(${entity.x.toFixed(2)} ${entity.y.toFixed(2)})`);
        if (entity.rotate !== null) parts.push(`rotate(${entity.rotate.toFixed(2)})`);
        if (entity.scaleX !== null && entity.scaleY !== null) {
          parts.push(`scale(${entity.scaleX.toFixed(3)} ${entity.scaleY.toFixed(3)})`);
        }
        const transform = parts.length ? parts.join(" ") : undefined;

        return (
          <g
            key={entity.id}
            className={classes}
            transform={transform}
            opacity={entity.opacity}
            role={interactive ? "button" : undefined}
            aria-label={entity.name}
            onClick={interactive ? () => onInspectOrganelle(entity.organelleId as string) : undefined}
          >
            {entity.shapes.map((spec, i) => (
              <SceneShape key={i} spec={spec} dashOffset={entity.dashOffset} />
            ))}
            {entity.label && (
              <text
                className="scene-entity-label"
                x={entity.label.dx ?? 0}
                y={entity.label.dy ?? 0}
              >
                {entity.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
