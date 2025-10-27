"use client";

import React from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

interface StoneTileProps {
    position: [number, number, number];
    size?: number;
}

export default function StoneTile({ position, size = 2 }: StoneTileProps) {
    const textures = useTexture({
        map: "/ground/Ground087_Color.jpg",
        normalMap: "/ground/Ground081Normal.jpg",
        roughnessMap: "/ground/Ground081_Roughness.jpg",
        aoMap: "/ground/Ground081_AO.jpg",
    });

    Object.values(textures).forEach((t) => {
        if (t) {
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.repeat.set(2, 2);
        }
    });

    return (
        <mesh position={position} rotation-x={-Math.PI / 2} receiveShadow castShadow>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial {...textures} roughness={0.8} metalness={0.2} displacementScale={0.03} />
        </mesh>
    );
}
