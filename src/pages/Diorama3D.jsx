import React, { Suspense, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html, Stars, useGLTF, useProgress } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Eye, Smartphone, ArrowLeft, Info, QrCode, Download, X, Camera } from 'lucide-react';

const COLORS = {
    base: '#09090c',
    accent: '#b45354',
    sky: '#7b98ab',
    deep: '#35446a',
    paper: '#f0ece5'
};

// Datos de los modelos 3D y su información histórica (LFS tracked)
const MODELS = [
    {
        id: 'diorama',
        name: 'Diorama Histórico de Malvinas',
        path: 'malvinas_alvaro_saez_pascual_facundo_patane.glb',
        scale: 0.8,
        description: 'Reconstrucción tridimensional detallada de una posición defensiva en las islas. Muestra las condiciones geográficas, el relieve rocoso y los refugios improvisados por los conscriptos durante la campaña de 1982.'
    },
    {
        id: 'backpack',
        name: 'Mochila Militar ALICE - Ejército Argentino',
        path: 'alice_military_backpack_-_argentinean_army.glb',
        scale: 1.5,
        description: 'Equipo de campaña reglamentario provisto a los soldados argentinos. Contenía elementos indispensables para la supervivencia en el clima hostil del sur: raciones, mudas de ropa seca, manta, linterna y efectos personales.'
    },
    {
        id: 'pucara',
        name: 'Avión de Combate FMA IA-58 Pucará',
        path: 'argentine_fma_ia_58_pucara.glb',
        scale: 0.45,
        description: 'Avión turbohélice de diseño y fabricación nacional. Operado por la Fuerza Aérea Argentina desde bases en las islas, cumplió misiones de ataque ligero, apoyo de fuego cercano y reconocimiento táctico.'
    },
    {
        id: 'mirage',
        name: 'Caza Interceptor Mirage III / Dagger',
        path: 'mirage_malvinas.glb',
        scale: 0.5,
        description: 'Avión de combate supersónico de origen francés. Protagonista de los combates de cobertura aérea sobre el archipiélago frente a las patrullas aéreas de combate de la Royal Navy.'
    },
    {
        id: 'trench',
        name: 'Posición Defensiva y Trinchera',
        path: '40001f96-0002-fd00-b63f-84710c7967bb.glb',
        scale: 1.3,
        description: 'Detalle tridimensional de un pozo de zorro y parapeto defensivo. Ilustra la precariedad de las fortificaciones erigidas sobre la turba húmeda del suelo malvinense bajo constantes bombardeos navales.'
    }
];

// Loader component (se renderiza fuera del Canvas para evitar conflictos de montaje)
const Loader = ({ active, progress }) => {
    if (!active) return null;
    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(9,9,12,0.96)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: '"Public Sans", sans-serif'
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
                padding: '2.5rem',
                borderRadius: '24px',
                color: COLORS.paper,
                textAlign: 'center',
                minWidth: '320px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '4px',
                    color: COLORS.accent,
                    fontWeight: 800,
                    marginBottom: '1rem'
                }}>
                    Cargando Modelo 3D
                </div>
                <div style={{
                    fontFamily: '"Playfair Display", serif',
                    fontSize: '1.8rem',
                    fontStyle: 'italic',
                    marginBottom: '1.5rem'
                }}>
                    {Math.round(progress)}%
                </div>
                <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    marginBottom: '1rem'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.sky})`,
                        transition: 'width 0.3s ease-out'
                    }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: COLORS.sky, opacity: 0.8 }}>
                    Cargando recursos interactivos...
                </div>
            </div>
        </div>
    );
};

// Componente dinámico para renderizar el modelo seleccionado
// Auto-centra y auto-escala dinámicamente cualquier modelo cargado basándose en su Bounding Box
const ModelRenderer = ({ model }) => {
    const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/${model.path}`);
    
    // Calcular centro y escala proporcional sólo una vez al cargar la escena
    const { center, scale } = React.useMemo(() => {
        const box = new THREE.Box3().setFromObject(scene);
        const ctr = new THREE.Vector3();
        box.getCenter(ctr);
        
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 2.8; // Tamaño estándar en el Canvas
        const scaleFactor = (targetSize / (maxDim || 1)) * model.scale;
        
        return { center: ctr, scale: scaleFactor };
    }, [scene, model]);

    return (
        <group scale={scale}>
            <primitive object={scene} position={[-center.x, -center.y, -center.z]} castShadow receiveShadow />
        </group>
    );
};

// Niebla y atmósfera de estudio para fondo claro
const Atmosphere = () => (
    <>
        <fog attach="fog" args={['#ffffff', 8, 25]} />
        <ambientLight intensity={0.8} />
        <directionalLight
            position={[5, 10, 5]}
            intensity={1.2}
            color="#ffffff"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, 4, -5]} color="#ffffff" intensity={0.5} />
    </>
);

const Diorama3D = () => {
    const { active, progress } = useProgress();
    const [activeIndex, setActiveIndex] = useState(0);
    const [autoRotate, setAutoRotate] = useState(true);
    const [showMarker, setShowMarker] = useState(false);

    const activeModel = MODELS[activeIndex];

    const nextModel = () => {
        setActiveIndex((prev) => (prev + 1) % MODELS.length);
    };

    const prevModel = () => {
        setActiveIndex((prev) => (prev - 1 + MODELS.length) % MODELS.length);
    };

    return (
        <div style={{ minHeight: '100vh', background: COLORS.base, color: COLORS.paper, fontFamily: '"Public Sans", sans-serif', overflowX: 'hidden' }}>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>

            {/* Pantalla de carga global fuera del Canvas */}
            <Loader active={active} progress={progress} />

            {/* Header overlay */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
                padding: '1rem 1.25rem',
                background: 'linear-gradient(180deg, rgba(9,9,12,0.85), rgba(9,9,12,0))',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                pointerEvents: 'none'
            }}>
                <a href="/" style={{ pointerEvents: 'auto', textDecoration: 'none', color: COLORS.paper, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(240,236,229,0.12)', padding: '0.5rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, backdropFilter: 'blur(8px)' }}>
                    <ArrowLeft size={16} /> Volver al proyecto
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', pointerEvents: 'none' }}>
                    <a href="/ar_malvinas.html" style={{ pointerEvents: 'auto', background: '#3b82f6', color: COLORS.paper, textDecoration: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
                        <Camera size={16} /> Abrir Cámara AR
                    </a>
                    <button onClick={() => setShowMarker(true)} style={{ pointerEvents: 'auto', background: COLORS.accent, color: COLORS.paper, border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                        <QrCode size={16} /> Ver Marcador
                    </button>
                </div>
            </header>

            {/* Canvas 3D */}
            <div style={{ width: '100vw', height: '60vh', position: 'relative', marginTop: '4rem' }}>
                <Canvas
                    shadows
                    camera={{ position: [0, 2.5, 6.5], fov: 45 }}
                    style={{ width: '100%', height: '100%' }}
                >
                    <color attach="background" args={['#ffffff']} />
                    <Suspense fallback={null}>
                        <Atmosphere />
                        {/* Render active model in carousel */}
                        <ModelRenderer model={activeModel} />
                    </Suspense>
                    <OrbitControls
                        enablePan={true}
                        minDistance={2.5}
                        maxDistance={12}
                        minPolarAngle={0.1}
                        maxPolarAngle={Math.PI / 2 - 0.05}
                        autoRotate={autoRotate}
                        autoRotateSpeed={0.4}
                    />
                </Canvas>

                {/* Toggles and overlays */}
                <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => setAutoRotate(!autoRotate)}
                        style={{
                            background: 'rgba(9,9,12,0.75)',
                            border: `1px solid ${COLORS.deep}`,
                            borderRadius: '8px',
                            color: COLORS.paper,
                            padding: '0.5rem 0.85rem',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            backdropFilter: 'blur(8px)',
                            fontWeight: 600
                        }}
                    >
                        🔄 Rotación automática: {autoRotate ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>

            {/* Carousel Selector UI */}
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
                    <button 
                        onClick={prevModel}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            cursor: 'pointer',
                            color: COLORS.paper,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            transition: 'background 0.2s'
                        }}
                    >
                        ◀
                    </button>

                    <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem 0' }}>
                        {MODELS.map((m, idx) => (
                            <button
                                key={m.id}
                                onClick={() => setActiveIndex(idx)}
                                style={{
                                    background: idx === activeIndex ? COLORS.accent : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${idx === activeIndex ? COLORS.accent : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: '12px',
                                    color: COLORS.paper,
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {m.name}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={nextModel}
                        style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            cursor: 'pointer',
                            color: COLORS.paper,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            transition: 'background 0.2s'
                        }}
                    >
                        ▶
                    </button>
                </div>

                {/* Description & Commands Panel */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
                    {/* Active Description */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid rgba(255,255,255,0.08)`,
                        borderRadius: '18px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.accent, fontWeight: 800, marginBottom: '0.5rem' }}>
                            Modelo {activeIndex + 1} de {MODELS.length}
                        </div>
                        <h2 style={{ fontFamily: '"Playfair Display", Georgia, serif', fontSize: '1.8rem', fontStyle: 'italic', margin: '0 0 1rem 0', color: COLORS.paper }}>
                            {activeModel.name}
                        </h2>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: COLORS.paper, opacity: 0.85, margin: 0 }}>
                            {activeModel.description}
                        </p>
                    </div>

                    {/* Navigation instructions */}
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid rgba(255,255,255,0.08)`,
                        borderRadius: '18px',
                        padding: '1.5rem',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky, fontWeight: 800, marginBottom: '1rem' }}>
                            Controles 3D interactivos
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>🖱️</span> 
                                <span><b>Girar:</b> Click izquierdo + arrastrar</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>🔍</span> 
                                <span><b>Zoom:</b> Rueda del mouse (Scroll)</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>✋</span> 
                                <span><b>Desplazar:</b> Click derecho + arrastrar</span>
                            </li>
                            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                <span style={{ fontSize: '1.2rem' }}>📱</span> 
                                <span><b>En pantallas táctiles:</b> Arrastrar con 1 dedo para rotar, pellizcar con 2 dedos para zoom.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modal de Marcador RA */}
            <AnimatePresence>
                {showMarker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
                            background: 'rgba(9,9,12,0.95)', backdropFilter: 'blur(10px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '2rem'
                        }}
                    >
                        <button onClick={() => setShowMarker(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: COLORS.paper, cursor: 'pointer' }}>
                            <X size={32} />
                        </button>
                        
                        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
                            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '3px', color: COLORS.accent, fontWeight: 800, marginBottom: '0.5rem' }}>
                                Marcador Oficial (HIRO)
                            </div>
                            <h2 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', fontSize: '2.5rem', margin: '0 0 1.5rem 0' }}>
                                Imprimí o mostrá esta imagen
                            </h2>
                            <p style={{ fontSize: '0.95rem', color: COLORS.sky, marginBottom: '2rem', lineHeight: 1.6 }}>
                                1. Mostrá este marcador en la pantalla de otro celular, o imprimilo.<br/>
                                2. Hacé clic en <b>"Abrir Cámara AR"</b> y apuntá hacia este marcador.<br/>
                                3. ¡El diorama de Malvinas aparecerá sobre la imagen en tiempo real!
                            </p>
                            
                            <div style={{ background: '#fff', padding: '1rem', borderRadius: '16px', display: 'inline-block', marginBottom: '2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                                <img src={`${import.meta.env.BASE_URL}malvinas_ar_anchor.png`} alt="Marcador HIRO" style={{ width: '280px', height: '280px', objectFit: 'contain', display: 'block' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <a href={`${import.meta.env.BASE_URL}malvinas_ar_anchor.png`} download="Marcador_HIRO_Malvinas.png" style={{ textDecoration: 'none', background: COLORS.paper, color: COLORS.base, fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Download size={18} /> Descargar Marcador
                                </a>
                                <a href="/ar_malvinas.html" style={{ textDecoration: 'none', background: '#3b82f6', color: COLORS.paper, fontWeight: 700, padding: '0.75rem 1.5rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Camera size={18} /> Iniciar Cámara
                                </a>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

useGLTF.preload(`${import.meta.env.BASE_URL}models/malvinas_alvaro_saez_pascual_facundo_patane.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/alice_military_backpack_-_argentinean_army.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/argentine_fma_ia_58_pucara.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/mirage_malvinas.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}models/40001f96-0002-fd00-b63f-84710c7967bb.glb`);

export default Diorama3D;
