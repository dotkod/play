"use client";

/**
 * Street furniture with instancing: every lamp in the city is one draw call (plus outline and
 * glow), same for trees, benches, bins and planters. Traffic lights read the signal timing.
 */

import { useFrame } from "@react-three/fiber";
import { memo, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { lampsOn, presetForFrac } from "@/world/lighting";
import { type Prop, STREETS } from "../plan";
import { glowMaterial, hullMaterial, kitMaterial, mergeGlow, mergeParts, type Part } from "../kit/merge";
import { BULBS, lampGlowParts, PROP_MODELS, signalPoleParts, treeParts } from "../kit/props";
import { signalFor } from "../sim/traffic";

type Spot = { x: number; z: number; rotY: number };

const tmp = new THREE.Object3D();

function setMatrices(mesh: THREE.InstancedMesh | null, spots: Spot[]) {
  if (!mesh) return;
  spots.forEach((s, i) => {
    tmp.position.set(s.x, 0, s.z);
    tmp.rotation.set(0, s.rotY, 0);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** One model, many copies. `glow` parts light up at night. */
export function Instanced({
  parts,
  spots,
  glow,
  glowWhen = () => presetForFrac().windows,
  outline = 0.03,
}: {
  parts: Part[];
  spots: Spot[];
  glow?: Part[];
  /** When the glow parts are lit (default: at night). */
  glowWhen?: () => boolean;
  outline?: number;
}) {
  const body = useRef<THREE.InstancedMesh>(null);
  const hull = useRef<THREE.InstancedMesh>(null);
  const lit = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => ({ ...mergeParts(parts, outline), glow: glow ? mergeGlow(glow) : null }), [parts, glow, outline]);
  useLayoutEffect(() => {
    setMatrices(body.current, spots);
    setMatrices(hull.current, spots);
    setMatrices(lit.current, spots);
  }, [spots]);
  useFrame(() => {
    if (lit.current) lit.current.visible = glowWhen();
  });
  if (!spots.length) return null;
  return (
    <group>
      <instancedMesh ref={body} args={[geo.body, kitMaterial(), spots.length]} castShadow receiveShadow />
      {geo.hull && <instancedMesh ref={hull} args={[geo.hull, hullMaterial(), spots.length]} />}
      {geo.glow && <instancedMesh ref={lit} args={[geo.glow, glowMaterial(), spots.length]} visible={false} />}
    </group>
  );
}

const byKind = (kind: Prop["kind"], filter: (p: Prop) => boolean = () => true) => STREETS.props.filter((p) => p.kind === kind && filter(p));
const inPlanter = (p: Prop) => STREETS.props.some((q) => q.kind === "planter" && q.x === p.x && q.z === p.z);

export const StreetProps = memo(function StreetProps() {
  const models = useMemo(() => {
    const out: { key: string; parts: Part[]; spots: Spot[]; glow?: Part[] }[] = [];
    for (const kind of ["lamp", "bench", "bin", "planter", "busStop", "fountain", "playground"] as const) {
      const build = PROP_MODELS[kind];
      if (build) out.push({ key: kind, parts: build(), spots: byKind(kind), glow: kind === "lamp" ? lampGlowParts() : undefined });
    }
    for (const v of [0, 1, 2]) {
      out.push({ key: `tree${v}`, parts: treeParts(v), spots: byKind("tree", (p) => p.variant % 3 === v && !inPlanter(p)) });
      out.push({ key: `ptree${v}`, parts: treeParts(v, false).map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] + 0.6, p.pos[2]] as Part["pos"] })), spots: byKind("tree", (p) => p.variant % 3 === v && inPlanter(p)) });
    }
    return out;
  }, []);
  return (
    <group>
      {models.map((m) => (
        <Instanced key={m.key} parts={m.parts} spots={m.spots} glow={m.glow} glowWhen={m.key === "lamp" ? lampsOn : undefined} />
      ))}
      <LampPools />
      <TrafficLights />
    </group>
  );
});

/** Warm pools of light on the pavement under each lamp head, shown while lamps are on. */
const LampPools = memo(function LampPools() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const lamps = useMemo(() => byKind("lamp"), []);
  const geo = useMemo(() => new THREE.CircleGeometry(2.6, 28).rotateX(-Math.PI / 2), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffd98a", transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  );
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    lamps.forEach((l, i) => {
      // The head hangs 1.6 m out over the road from the pole
      tmp.position.set(l.x + Math.sin(l.rotY) * 1.6, 0.07, l.z + Math.cos(l.rotY) * 1.6);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [lamps]);
  useFrame(() => {
    if (mesh.current) mesh.current.visible = lampsOn();
  });
  return <instancedMesh ref={mesh} args={[geo, mat, lamps.length]} visible={false} />;
});

const BULB_ON: Record<(typeof BULBS)[number]["color"], THREE.Color> = {
  red: new THREE.Color("#ff3b30"),
  amber: new THREE.Color("#ffb020"),
  green: new THREE.Color("#30d158"),
};
const BULB_OFF = new THREE.Color("#2b2b2b");

/** Signal poles plus three bulbs each; bulbs switch colour with the junction's timing. */
const TrafficLights = memo(function TrafficLights() {
  const signals = STREETS.signals;
  const spots = useMemo(() => signals.map((s) => ({ x: s.x, z: s.z, rotY: s.rotY })), [signals]);
  const parts = useMemo(() => signalPoleParts(), []);
  const bulbs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const bulbGeo = useMemo(() => new THREE.CircleGeometry(0.11, 12), []);
  const bulbMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);

  useLayoutEffect(() => {
    BULBS.forEach((b, k) => {
      const mesh = bulbs.current[k];
      if (!mesh) return;
      signals.forEach((s, i) => {
        tmp.position.set(s.x, 0, s.z);
        tmp.rotation.set(0, s.rotY, 0);
        tmp.updateMatrix();
        const local = new THREE.Matrix4().makeTranslation(0, b.y, 0.15);
        mesh.setMatrixAt(i, tmp.matrix.clone().multiply(local));
        mesh.setColorAt(i, BULB_OFF);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
  }, [signals]);

  const last = useRef(-1);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    // Signals only change a few times a second; skip work in between
    const tick = Math.floor(t * 4);
    if (tick === last.current) return;
    last.current = tick;
    BULBS.forEach((b, k) => {
      const mesh = bulbs.current[k];
      if (!mesh) return;
      signals.forEach((s, i) => {
        const on = signalFor(s.node, s.dir.x !== 0 ? "x" : "z", t) === b.color;
        mesh.setColorAt(i, on ? BULB_ON[b.color] : BULB_OFF);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  });

  return (
    <group>
      <Instanced parts={parts} spots={spots} />
      {BULBS.map((b, k) => (
        <instancedMesh
          key={b.color}
          ref={(m) => {
            bulbs.current[k] = m;
          }}
          args={[bulbGeo, bulbMat, signals.length]}
        />
      ))}
    </group>
  );
});
