"use client";

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Sky } from "@react-three/drei";
import * as THREE from "three";
import StoneTile from "./StoneTile";
import { ItemType } from "./GardenScene";

export interface GardenCanvasProps {
    mode: "view" | "edit";
    grid: (ItemType | null)[][];
    setGrid: React.Dispatch<React.SetStateAction<(ItemType | null)[][]>>;
    selectedItem: ItemType;
    gridSize: number;
}

export default function GardenCanvas({ mode, grid, setGrid, selectedItem, gridSize }: GardenCanvasProps) {
    const CELL_SIZE = 2;

    const handleCellClick = (row: number, col: number) => {
        if (mode !== "edit" || !selectedItem) return;
        const newGrid = grid.map((r) => [...r]);
        newGrid[row][col] = selectedItem;
        setGrid(newGrid);
    };

    return (
        <Canvas shadows camera={{ position: [15, 20, 15], fov: 55 }}>
            <Sky sunPosition={[100, 20, 100]} />
            <ambientLight intensity={0.8} />
            <directionalLight position={[20, 25, 10]} intensity={1.2} castShadow />

            <OrbitControls
                enablePan={false}
                enableZoom
                maxDistance={60}
                minDistance={10}
                minPolarAngle={Math.PI / 3.5}
                maxPolarAngle={Math.PI / 3}
            />

            {/* 기본 잔디 */}
            <mesh rotation-x={-Math.PI / 2} receiveShadow>
                <planeGeometry args={[gridSize * CELL_SIZE, gridSize * CELL_SIZE]} />
                <meshStandardMaterial color="#bfe5a0" />
            </mesh>

            {/* 셀 + 오브젝트 렌더링 */}
            {Array.from({ length: gridSize }).map((_, row) =>
                Array.from({ length: gridSize }).map((_, col) => {
                    const pos: [number, number, number] = [
                        (col - gridSize / 2 + 0.5) * CELL_SIZE,
                        0.01,
                        (row - gridSize / 2 + 0.5) * CELL_SIZE,
                    ];
                    const item = grid[row][col];

                    return (
                        <group key={`cell-${row}-${col}`}>
                            <mesh
                                position={pos}
                                rotation-x={-Math.PI / 2}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(row, col);
                                }}
                            >
                                <planeGeometry args={[CELL_SIZE, CELL_SIZE]} />
                                <meshBasicMaterial transparent opacity={0} />
                            </mesh>

                            {item === "path" && <StoneTile position={pos} />}
                            {item === "tree" && (
                                <mesh position={[pos[0], 1, pos[2]]}>
                                    <cylinderGeometry args={[0.2, 0.3, 1.8, 12]} />
                                    <meshStandardMaterial color="#8b5a2b" />
                                    <mesh position={[0, 1.2, 0]}>
                                        <sphereGeometry args={[0.9, 16, 16]} />
                                        <meshStandardMaterial color="#5bb45b" />
                                    </mesh>
                                </mesh>
                            )}
                            {item === "fence" && (
                                <mesh position={pos}>
                                    <boxGeometry args={[1.5, 0.5, 0.2]} />
                                    <meshStandardMaterial color="#c69c6d" />
                                </mesh>
                            )}
                        </group>
                    );
                })
            )}
        </Canvas>
    );
}
