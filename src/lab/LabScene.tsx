import type { LabParamDef } from "../types";

/**
 * 虚拟实验场景：三种实验各一个 SVG 场景。
 * 场景是 (细胞类型, 条件参数, 当前变量值) 的纯函数 ——
 * 播放、暂停、拖动到任意时刻，画面都与该时刻的数据状态严格对应。
 */

interface SceneProps {
  cellId: string;
  params: Record<string, number>;
  /** 当前时刻的变量值；null 表示尚未运行（待机画面） */
  values: Record<string, number> | null;
  playing: boolean;
}

/** 确定性伪随机（让溶质颗粒、气泡位置固定可复现） */
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ================= 渗透作用场景 ================= */

function OsmosisScene({ cellId, params, values, playing }: SceneProps) {
  const external = params.externalConc ?? 0.15;
  const internal = cellId === "animal" ? 0.3 : cellId === "plant" ? 0.55 : 0.45;
  const volume = values?.volume ?? 1;
  const integrity = values?.integrity ?? 100;
  const idle = values === null;

  const hypo = external < internal - 0.05;
  const hyper = external > internal + 0.05;
  const soluteCount = Math.round(6 + external * 64);
  const ruptured = integrity < 60;

  /* 水分子净移动方向箭头 */
  const flowArrows = [0, 1, 2].map((i) => {
    const angle = (i / 3) * Math.PI * 2 + 0.5;
    return { angle, key: i };
  });

  return (
    <g className={playing ? "" : "is-paused"} opacity={idle ? 0.55 : 1}>
      {/* 外界溶液中的溶质颗粒 */}
      {Array.from({ length: soluteCount }, (_, i) => (
        <circle
          key={i}
          cx={40 + rand(i, 1) * 720}
          cy={30 + rand(i, 2) * 360}
          r={2.4 + rand(i, 3) * 2}
          fill="#8fa3ea"
          opacity={0.5}
        />
      ))}

      {/* 水分净移动方向 */}
      {(hypo || hyper) && !ruptured && (
        <g className="lab-flow" stroke="#6db3f2" strokeWidth={2.5} fill="none" strokeLinecap="round">
          {flowArrows.map(({ angle, key }) => {
            const rOut = 205;
            const rIn = 150;
            const x1 = 400 + Math.cos(angle) * (hypo ? rOut : rIn);
            const y1 = 210 + Math.sin(angle) * (hypo ? rOut : rIn) * 0.72;
            const x2 = 400 + Math.cos(angle) * (hypo ? rIn : rOut);
            const y2 = 210 + Math.sin(angle) * (hypo ? rIn : rOut) * 0.72;
            return (
              <g key={key}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray="5 7" />
                <path
                  d={`M ${x2} ${y2} l ${hypo ? -8 : 8} -5 M ${x2} ${y2} l ${hypo ? -8 : 8} 5`}
                  transform={`rotate(${(angle * 180) / Math.PI} ${x2} ${y2})`}
                />
              </g>
            );
          })}
        </g>
      )}

      {cellId === "animal" && <AnimalOsmosis volume={volume} integrity={integrity} />}
      {cellId === "plant" && <PlantOsmosis volume={volume} />}
      {cellId === "prokaryote" && <ProkaryoteOsmosis volume={volume} />}

      <text className="lab-scene-note" x={24} y={402}>
        外界溶液 {external.toFixed(2)} mol/L · 细胞内约 {internal.toFixed(2)} mol/L
      </text>
      {ruptured && (
        <text className="lab-scene-alert" x={400} y={40} textAnchor="middle">
          细胞膜已涨破（教学模型）
        </text>
      )}
    </g>
  );
}

/** 动物细胞：无壁，体积自由变化，过度吸水会涨破 */
function AnimalOsmosis({ volume, integrity }: { volume: number; integrity: number }) {
  const r = 92 * Math.sqrt(clamp(volume, 0.3, 1.7));
  const ruptured = integrity < 60;
  return (
    <g>
      {/* 涨破后外泄的内容物 */}
      {ruptured && (
        <g fill="#c9a0b8" opacity={0.5}>
          {Array.from({ length: 10 }, (_, i) => (
            <circle key={i} cx={400 + (rand(i, 5) - 0.5) * 320} cy={210 + (rand(i, 6) - 0.5) * 240} r={2 + rand(i, 7) * 3} />
          ))}
        </g>
      )}
      <circle
        cx={400}
        cy={210}
        r={r}
        fill="rgba(232, 160, 191, .14)"
        stroke="#e8a0bf"
        strokeWidth={3}
        strokeDasharray={ruptured ? "14 10" : undefined}
        strokeLinecap="round"
      />
      {!ruptured && <circle cx={400} cy={210} r={r * 0.34} fill="rgba(180, 130, 220, .3)" stroke="#9b6dd6" strokeWidth={2} />}
      {ruptured && (
        <text className="lab-scene-label" x={400} y={215} textAnchor="middle">
          内容物外泄
        </text>
      )}
      <text className="lab-scene-label" x={400} y={210 + r + 26} textAnchor="middle">
        细胞膜 · 体积 {(volume * 100).toFixed(0)}%
      </text>
    </g>
  );
}

/** 植物细胞：细胞壁固定，原生质体随失水收缩（质壁分离） */
function PlantOsmosis({ volume }: { volume: number }) {
  const s = 0.42 + 0.58 * clamp(volume, 0.4, 1.05);
  const w = 380 * s;
  const h = 240 * s;
  const plasmolysis = volume < 0.97;
  return (
    <g>
      {/* 细胞壁（始终不变） */}
      <rect x={400 - 190} y={210 - 120} width={380} height={240} rx={26} fill="rgba(151, 216, 164, .07)" stroke="#7fbf8a" strokeWidth={5} />
      <text className="lab-scene-label" x={400} y={210 - 132} textAnchor="middle">
        细胞壁（形态不变）
      </text>
      {/* 原生质体 */}
      <rect x={400 - w / 2} y={210 - h / 2} width={w} height={h} rx={20} fill="rgba(120, 200, 140, .18)" stroke="#98f0c6" strokeWidth={2.5} />
      {/* 液泡 */}
      <rect x={400 - w * 0.3} y={210 - h * 0.28} width={w * 0.6} height={h * 0.56} rx={16} fill="rgba(127, 184, 240, .14)" stroke="#7fb8f0" strokeWidth={1.5} />
      {/* 叶绿体 */}
      {Array.from({ length: 6 }, (_, i) => {
        const px = 400 + (rand(i, 8) - 0.5) * w * 0.78;
        const py = 210 + (rand(i, 9) - 0.5) * h * 0.72;
        return <ellipse key={i} cx={px} cy={py} rx={13} ry={7} fill="rgba(46, 139, 87, .55)" stroke="#2d6a4f" strokeWidth={1.2} transform={`rotate(${rand(i, 10) * 180} ${px} ${py})`} />;
      })}
      {plasmolysis && (
        <text className="lab-scene-alert" x={400} y={210 + 120 + 30} textAnchor="middle">
          质壁分离：原生质层与细胞壁分离
        </text>
      )}
      {!plasmolysis && (
        <text className="lab-scene-label" x={400} y={210 + 120 + 30} textAnchor="middle">
          原生质体 · 体积 {(volume * 100).toFixed(0)}%
        </text>
      )}
    </g>
  );
}

/** 原核细胞：杆状，有细胞壁，行为类似植物细胞 */
function ProkaryoteOsmosis({ volume }: { volume: number }) {
  const s = 0.45 + 0.55 * clamp(volume, 0.4, 1.05);
  const w = 400 * s;
  const h = 150 * s;
  return (
    <g>
      <rect x={400 - 200} y={210 - 75} width={400} height={150} rx={75} fill="rgba(240, 200, 120, .07)" stroke="#d9b36c" strokeWidth={5} />
      <text className="lab-scene-label" x={400} y={210 - 92} textAnchor="middle">
        细胞壁（形态不变）
      </text>
      <rect x={400 - w / 2} y={210 - h / 2} width={w} height={h} rx={h / 2} fill="rgba(240, 200, 120, .16)" stroke="#f0c878" strokeWidth={2.5} />
      {/* 拟核 */}
      <path
        d={`M ${400 - w * 0.22} 210 q ${w * 0.1} -26 ${w * 0.2} 0 t ${w * 0.2} 0`}
        fill="none"
        stroke="#b9a8ff"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} cx={400 + (rand(i, 11) - 0.5) * w * 0.8} cy={210 + (rand(i, 12) - 0.5) * h * 0.6} r={3} fill="#6a4c93" opacity={0.7} />
      ))}
      <text className="lab-scene-label" x={400} y={210 + 75 + 28} textAnchor="middle">
        细胞质 · 体积 {(volume * 100).toFixed(0)}%
      </text>
    </g>
  );
}

/* ================= 温度与细胞呼吸场景 ================= */

function RespirationScene({ cellId, params, values, playing }: SceneProps) {
  const temperature = params.temperature ?? 25;
  const oxygen = params.oxygen ?? 21;
  const rate = values?.atpRate ?? 0.6;
  const enzyme = values?.enzyme ?? 100;
  const idle = values === null;

  const denature = cellId === "animal" ? 42 : cellId === "plant" ? 40 : 45;
  const pulseDuration = clamp(2.6 - rate * 1.7, 0.7, 2.8);
  const mitoPositions: Array<[number, number, number]> = [
    [330, 170, -18],
    [460, 240, 24],
    [360, 280, 8]
  ];

  return (
    <g className={playing ? "" : "is-paused"} opacity={idle ? 0.55 : 1}>
      {/* 温度色调提示 */}
      {temperature < 10 && <rect x={0} y={0} width={800} height={420} fill="#4d8fd1" opacity={((10 - temperature) / 10) * 0.12} />}
      {temperature > denature && <rect x={0} y={0} width={800} height={420} fill="#d1604d" opacity={clamp((temperature - denature) / 10, 0, 1) * 0.16} />}

      {/* 细胞轮廓（按类型简化绘制） */}
      {cellId === "animal" && <circle cx={400} cy={220} r={150} fill="rgba(232, 160, 191, .1)" stroke="#e8a0bf" strokeWidth={3} />}
      {cellId === "plant" && (
        <g>
          <rect x={230} y={100} width={340} height={240} rx={24} fill="rgba(151, 216, 164, .07)" stroke="#7fbf8a" strokeWidth={5} />
          <rect x={246} y={116} width={308} height={208} rx={18} fill="rgba(120, 200, 140, .1)" stroke="#98f0c6" strokeWidth={2} />
        </g>
      )}
      {cellId === "prokaryote" && (
        <g>
          <rect x={200} y={145} width={400} height={150} rx={75} fill="rgba(240, 200, 120, .08)" stroke="#d9b36c" strokeWidth={5} />
          <rect x={214} y={159} width={372} height={122} rx={61} fill="rgba(240, 200, 120, .12)" stroke="#f0c878" strokeWidth={2} />
          {/* 拟核 */}
          <path d="M 340 220 q 30 -24 60 0 t 60 0" fill="none" stroke="#b9a8ff" strokeWidth={3} strokeLinecap="round" opacity={0.8} />
        </g>
      )}

      {/* 真核细胞：线粒体（脉动频率 ∝ 呼吸速率）；原核细胞：呼吸酶分布在细胞膜上 */}
      {cellId !== "prokaryote" &&
        mitoPositions.map(([cx, cy, angle], i) => (
          <g key={i} className="lab-pulse" style={{ animationDuration: `${pulseDuration}s` }}>
            <g transform={`rotate(${angle} ${cx} ${cy})`}>
              <ellipse cx={cx} cy={cy} rx={42} ry={20} fill="rgba(224, 118, 90, .22)" stroke="#e0765a" strokeWidth={2.5} />
              <path
                d={`M ${cx - 30} ${cy} q 7.5 -11 15 0 t 15 0 t 15 0 t 15 0`}
                fill="none"
                stroke="#c94f63"
                strokeWidth={2}
                strokeLinecap="round"
                opacity={enzyme / 100}
              />
            </g>
          </g>
        ))}
      {cellId === "prokaryote" && (
        <g>
          {[
            [250, 175],
            [400, 165],
            [550, 175],
            [250, 265],
            [400, 277],
            [550, 265]
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              className="lab-pulse"
              style={{ animationDuration: `${pulseDuration}s` }}
              cx={cx}
              cy={cy}
              r={7}
              fill="rgba(224, 118, 90, .3)"
              stroke="#e0765a"
              strokeWidth={2}
              opacity={0.25 + (enzyme / 100) * 0.75}
            />
          ))}
          <text className="lab-scene-tick" x={400} y={130} textAnchor="middle">
            呼吸酶分布在细胞膜上（原核细胞没有线粒体）
          </text>
        </g>
      )}

      {/* ATP 微粒：从产能结构升起，数量与不透明度 ∝ 速率 */}
      {rate > 0.05 &&
        (cellId === "prokaryote"
          ? ([[280, 168], [400, 158], [520, 168]] as Array<[number, number]>)
          : mitoPositions.map(([x, y]) => [x, y] as [number, number])
        ).map(([cx, cy], i) =>
          [0, 1].map((j) => (
            <text
              key={`${i}-${j}`}
              className="lab-rise"
              x={cx + (j === 0 ? -14 : 16)}
              y={cy - 24}
              style={{ animationDuration: `${clamp(3.2 - rate * 2, 1, 3.2) + i * 0.4 + j * 0.7}s`, opacity: clamp(rate, 0.1, 1) }}
              fill="#f2c063"
              fontSize={13}
              fontWeight={700}
            >
              ATP
            </text>
          ))
        )}

      {/* 温度计 */}
      <g>
        <rect x={700} y={80} width={16} height={240} rx={8} fill="rgba(184, 232, 203, .1)" stroke="rgba(184, 232, 203, .4)" strokeWidth={1.5} />
        <rect
          x={703}
          y={320 - (clamp(temperature, 0, 50) / 50) * 234}
          width={10}
          height={(clamp(temperature, 0, 50) / 50) * 234}
          rx={5}
          fill={temperature > denature ? "#e0705a" : temperature < 10 ? "#6db3f2" : "#98f0c6"}
        />
        <line x1={694} x2={722} y1={320 - (denature / 50) * 234} y2={320 - (denature / 50) * 234} stroke="#e0705a" strokeWidth={1.5} strokeDasharray="3 3" />
        <text className="lab-scene-label" x={708} y={345} textAnchor="middle">
          {temperature}°C
        </text>
        <text className="lab-scene-tick" x={726} y={324 - (denature / 50) * 234}>
          变性
        </text>
      </g>

      <text className="lab-scene-note" x={24} y={402}>
        氧气 {oxygen}% · 酶活性 {enzyme.toFixed(0)}%
      </text>
      {enzyme < 55 && (
        <text className="lab-scene-alert" x={400} y={52} textAnchor="middle">
          酶大量变性，供能不足（教学模型）
        </text>
      )}
    </g>
  );
}

/* ================= 光照与光合作用场景 ================= */

function PhotosynthesisScene({ params, values, playing }: SceneProps) {
  const light = params.light ?? 600;
  const co2 = params.co2 ?? 0.04;
  const net = values?.netPhoto ?? 5;
  const idle = values === null;

  const lightRatio = clamp(light / 2000, 0, 1);
  const co2Count = Math.round((co2 / 0.1) * 20);
  const releasing = net > 0.3;
  const chloroplasts: Array<[number, number, number]> = [
    [320, 170, -12],
    [470, 160, 18],
    [350, 280, 30],
    [480, 270, -24]
  ];

  return (
    <g className={playing ? "" : "is-paused"} opacity={idle ? 0.55 : 1}>
      {/* 太阳与光线 */}
      <g opacity={0.25 + lightRatio * 0.75}>
        <circle cx={110} cy={80} r={34} fill="#f2c063" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={110 + Math.cos(a) * 44}
              y1={80 + Math.sin(a) * 44}
              x2={110 + Math.cos(a) * 58}
              y2={80 + Math.sin(a) * 58}
              stroke="#f2c063"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </g>
      {[0, 1, 2].map((i) => (
        <polygon
          key={i}
          points={`${130 + i * 26},${96 + i * 10} ${300 + i * 60},${150 + i * 40} ${290 + i * 60},${185 + i * 40}`}
          fill="#f2c063"
          opacity={lightRatio * 0.12}
        />
      ))}

      {/* CO₂ 颗粒从右侧漂入 */}
      {Array.from({ length: co2Count }, (_, i) => (
        <g key={i} className="lab-drift" style={{ animationDuration: `${7 + rand(i, 13) * 6}s`, animationDelay: `${-rand(i, 14) * 8}s` }}>
          <circle cx={700 + rand(i, 15) * 60} cy={60 + rand(i, 16) * 300} r={4} fill="#a9b8d8" opacity={0.7} />
          <text x={700 + rand(i, 15) * 60 + 7} y={60 + rand(i, 16) * 300 + 3} className="lab-scene-tick">
            CO₂
          </text>
        </g>
      ))}

      {/* 植物细胞 */}
      <rect x={230} y={100} width={340} height={240} rx={24} fill="rgba(151, 216, 164, .07)" stroke="#7fbf8a" strokeWidth={5} />
      <rect x={246} y={116} width={308} height={208} rx={18} fill="rgba(120, 200, 140, .1)" stroke="#98f0c6" strokeWidth={2} />
      {chloroplasts.map(([cx, cy, angle], i) => (
        <g key={i} transform={`rotate(${angle} ${cx} ${cy})`}>
          <ellipse cx={cx} cy={cy} rx={34} ry={19} fill="rgba(46, 139, 87, .5)" stroke="#2d6a4f" strokeWidth={2} />
          <line x1={cx - 24} x2={cx + 24} y1={cy - 6} y2={cy - 6} stroke="#1d4a34" strokeWidth={1.5} opacity={0.6} />
          <line x1={cx - 27} x2={cx + 27} y1={cy + 1} y2={cy + 1} stroke="#1d4a34" strokeWidth={1.5} opacity={0.6} />
          <line x1={cx - 24} x2={cx + 24} y1={cy + 8} y2={cy + 8} stroke="#1d4a34" strokeWidth={1.5} opacity={0.6} />
        </g>
      ))}

      {/* O₂ 气泡：释放速率 ∝ 净光合 */}
      {releasing &&
        chloroplasts.map(([cx, cy], i) =>
          [0, 1].map((j) => (
            <g
              key={`${i}-${j}`}
              className="lab-bubble"
              style={{
                animationDuration: `${clamp(4.5 - net * 0.18, 1.4, 4.5) + i * 0.5 + j * 0.9}s`,
                animationDelay: `${-j * 1.3 - i * 0.6}s`,
                opacity: clamp(net / 14, 0.12, 0.95)
              }}
            >
              <circle cx={cx + (j === 0 ? -10 : 12)} cy={cy - 22} r={5} fill="rgba(127, 184, 240, .5)" stroke="#7fb8f0" strokeWidth={1.2} />
              <text x={cx + (j === 0 ? -10 : 12) + 8} y={cy - 18} className="lab-scene-tick">
                O₂
              </text>
            </g>
          ))
        )}
      {!releasing && (
        <text className="lab-scene-alert" x={400} y={70} textAnchor="middle">
          净光合 ≤ 0：细胞净消耗 O₂（教学模型）
        </text>
      )}

      <text className="lab-scene-note" x={24} y={402}>
        光照 {light} μmol/(m²·s) · CO₂ {co2.toFixed(3)}%
      </text>
    </g>
  );
}

/* ================= 场景入口 ================= */

export default function LabScene({
  experimentId,
  cellId,
  params,
  values,
  playing
}: SceneProps & { experimentId: string }) {
  return (
    <svg className="lab-svg" viewBox="0 0 800 420" role="img" aria-label="虚拟实验场景">
      {experimentId === "osmosis" && (
        <OsmosisScene cellId={cellId} params={params} values={values} playing={playing} />
      )}
      {experimentId === "respiration" && (
        <RespirationScene cellId={cellId} params={params} values={values} playing={playing} />
      )}
      {experimentId === "photosynthesis" && (
        <PhotosynthesisScene cellId={cellId} params={params} values={values} playing={playing} />
      )}
    </svg>
  );
}
