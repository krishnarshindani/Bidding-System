import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Text, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

function FloatingCube({ position, color, size = 0.5, speed = 1 }: { position: [number, number, number]; color: string; size?: number; speed?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3 * speed;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2 * speed;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.3;
    }
  });

  return (
    <Float speed={speed} rotationIntensity={0.3} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} scale={size}>
        <boxGeometry args={[1, 1, 1]} />
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.8}
          distort={0.15}
          speed={2}
          transparent
          opacity={0.85}
        />
      </mesh>
    </Float>
  );
}

function DataBars() {
  const groupRef = useRef<THREE.Group>(null);
  const barData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      height: Math.random() * 2 + 0.5,
      x: (i - 5.5) * 0.7,
      color: `hsl(${40 + i * 5}, ${70 + Math.random() * 20}%, ${50 + Math.random() * 15}%)`,
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {barData.map((bar, i) => (
        <mesh key={i} position={[bar.x, bar.height / 2, 0]}>
          <boxGeometry args={[0.45, bar.height, 0.45]} />
          <meshStandardMaterial
            color={bar.color}
            emissive={bar.color}
            emissiveIntensity={0.15}
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      {/* Grid floor */}
      <gridHelper args={[10, 20, "#e5a919", "rgba(229,169,25,0.1)"]} position={[0, 0, 0]} />
    </group>
  );
}

function AuroraRing({ radius = 3, color = "#e5a919" }: { radius?: number; color?: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.1;
      ref.current.rotation.z = state.clock.elapsedTime * 0.15;
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.02, 16, 100]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        transparent
        opacity={0.35}
      />
    </mesh>
  );
}

function DataParticles() {
  const count = 150;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#e5a919" transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}

export default function Dashboard3D() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, type: "spring" }}
      className="glass-card p-6 overflow-hidden"
    >
      <h3 className="text-lg font-semibold mb-4">🌐 3D Analytics Dashboard</h3>
      <div className="h-[350px] rounded-xl overflow-hidden" style={{ background: "radial-gradient(ellipse at center, rgba(229,169,25,0.05) 0%, rgba(10,10,15,0.9) 70%)" }}>
        <Canvas camera={{ position: [0, 2, 7], fov: 50 }} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} color="#fff5e0" />
          <pointLight position={[-3, 3, 3]} intensity={0.5} color="#e5a919" />
          <pointLight position={[3, -2, -3]} intensity={0.3} color="#8b5cf6" />

          <DataBars />
          <FloatingCube position={[-3, 1.5, -2]} color="#e5a919" size={0.4} speed={0.8} />
          <FloatingCube position={[3.5, 2, -1]} color="#8b5cf6" size={0.3} speed={1.2} />
          <FloatingCube position={[-2, 2.5, 1]} color="#22c55e" size={0.25} speed={0.6} />
          <AuroraRing radius={4} color="#e5a919" />
          <AuroraRing radius={5} color="#8b5cf6" />
          <DataParticles />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} maxPolarAngle={Math.PI / 2.2} minPolarAngle={Math.PI / 4} />
        </Canvas>
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">Drag to rotate · Interactive 3D visualization of auction data</p>
    </motion.div>
  );
}
