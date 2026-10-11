"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { cachedParts, hullMaterial, kitMaterial, mergeParts } from "@/city/kit/merge";
import { toonGradient } from "@/shared/three/toon";
import { trainBodyParts, trainCabinGlassParts, trainInteriorParts, trainRoofParts } from "../kit";
import { DOOR_HALF, TRAIN_WIDTH } from "../plan";
import { getShuttle } from "../sim/shuttle";
import { fare } from "./fare";
import { CabinNpcs } from "./cabin-npcs";
import { CabinPid } from "./cabin-pid";

const DOOR_COLOR = "#e8e4da";
const LEAF_W = DOOR_HALF - 0.1;
const LEAF_H = 1.95;
const LEAF_Y = 0.28 + LEAF_H / 2;
const WALL_X = TRAIN_WIDTH / 2 - 0.2;

function cabinGlassMaterial() {
  return new THREE.MeshBasicMaterial({
    color: "#7a9eb0",
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

function doorMaterial() {
  return new THREE.MeshToonMaterial({ color: DOOR_COLOR, gradientMap: toonGradient() });
}

/** One leaf — slides along ±z when doors open (no scale, no shared faces with liner). */
function DoorLeaf({
  side,
  zSign,
  openAmt,
  mat,
}: {
  side: -1 | 1;
  zSign: -1 | 1;
  openAmt: RefObject<number>;
  mat: THREE.MeshToonMaterial;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const closed = zSign * (LEAF_W / 2);
    const open = zSign * (DOOR_HALF + LEAF_W / 2 + 0.15);
    const t = openAmt.current;
    ref.current.position.z = closed + (open - closed) * t;
    ref.current.visible = t < 0.98;
  });
  return (
    <mesh ref={ref} position={[side * WALL_X, LEAF_Y, zSign * (LEAF_W / 2)]} material={mat}>
      <boxGeometry args={[0.05, LEAF_H, LEAF_W]} />
    </mesh>
  );
}

export function LrtTrain({ active }: { active: boolean }) {
  void active;
  const root = useRef<THREE.Group>(null);
  const exterior = useRef<THREE.Group>(null);
  const openAmt = useRef(0);
  const body = useMemo(() => cachedParts("lrt-train-body-v7", trainBodyParts, 0.02), []);
  const roofMesh = useMemo(() => cachedParts("lrt-train-roof-v7", trainRoofParts, 0.02), []);
  const interior = useMemo(() => cachedParts("lrt-train-interior-v11", trainInteriorParts, 0.02), []);
  const glass = useMemo(() => mergeParts(trainCabinGlassParts(), 0), []);
  const glassMat = useMemo(() => cabinGlassMaterial(), []);
  const doorMat = useMemo(() => doorMaterial(), []);

  useFrame((_, delta) => {
    const st = getShuttle();
    if (root.current) {
      root.current.position.set(st.x, st.y, st.z);
      root.current.rotation.y = st.rotY;
    }
    const want = st.doorsOpen ? 1 : 0;
    openAmt.current += (want - openAmt.current) * Math.min(1, delta * 5);
    // Outer skin off while riding so open window frames show the world
    if (exterior.current) exterior.current.visible = !fare.riding;
  });

  return (
    <group ref={root}>
      <group ref={exterior}>
        <mesh geometry={body.body} material={kitMaterial()} castShadow />
        {body.hull && <mesh geometry={body.hull} material={hullMaterial()} />}
        <mesh geometry={roofMesh.body} material={kitMaterial()} castShadow />
        {roofMesh.hull && <mesh geometry={roofMesh.hull} material={hullMaterial()} />}
      </group>
      <mesh geometry={interior.body} material={kitMaterial()} />
      {interior.hull && <mesh geometry={interior.hull} material={hullMaterial()} />}
      <mesh geometry={glass.body} material={glassMat} />
      <CabinPid />
      <CabinNpcs />
      <DoorLeaf side={-1} zSign={-1} openAmt={openAmt} mat={doorMat} />
      <DoorLeaf side={-1} zSign={1} openAmt={openAmt} mat={doorMat} />
      <DoorLeaf side={1} zSign={-1} openAmt={openAmt} mat={doorMat} />
      <DoorLeaf side={1} zSign={1} openAmt={openAmt} mat={doorMat} />
    </group>
  );
}
