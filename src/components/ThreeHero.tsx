import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

function GoldSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });
  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={1}>
      <mesh ref={meshRef} scale={2.2}>
        <icosahedronGeometry args={[1, 4]} />
        <MeshDistortMaterial
          color="#e5a919"
          emissive="#b8860b"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.9}
          distort={0.25}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

function Particles() {
  const count = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05;
      ref.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#e5a919" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function Rings() {
  const ref1 = useRef<THREE.Mesh>(null);
  const ref2 = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref1.current) {
      ref1.current.rotation.x = t * 0.3;
      ref1.current.rotation.z = t * 0.1;
    }
    if (ref2.current) {
      ref2.current.rotation.x = t * 0.2 + 1;
      ref2.current.rotation.y = t * 0.15;
    }
  });
  return (
    <>
      <mesh ref={ref1}>
        <torusGeometry args={[3.5, 0.02, 16, 100]} />
        <meshStandardMaterial color="#e5a919" emissive="#b8860b" emissiveIntensity={0.5} transparent opacity={0.4} />
      </mesh>
      <mesh ref={ref2}>
        <torusGeometry args={[4, 0.015, 16, 100]} />
        <meshStandardMaterial color="#e5a919" emissive="#b8860b" emissiveIntensity={0.3} transparent opacity={0.25} />
      </mesh>
    </>
  );
}

export default function ThreeHero() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }} gl={{ alpha: true, antialias: true }}>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#fff5e0" />
        <pointLight position={[-5, -5, 5]} intensity={0.5} color="#e5a919" />
        <GoldSphere />
        <Particles />
        <Rings />
      </Canvas>
    </div>
  );
}
