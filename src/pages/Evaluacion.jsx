import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock, ChevronLeft, ChevronRight, CheckCircle, XCircle, Send,
    Trophy, Download, AlertCircle, BookOpen, User
} from 'lucide-react';

const COLORS = {
    base: '#09090c',
    accent: '#b45354',
    sky: '#7b98ab',
    deep: '#35446a',
    paper: '#f0ece5'
};

const QUIZ_DURATION = 15 * 60; // 15 minutos en segundos

const QUESTIONS = [
    {
        q: '¿Dónde están ubicadas geográficamente las Islas Malvinas?',
        opts: [
            'En el Océano Pacífico, frente a Chile',
            'En el Atlántico Sur, plataforma continental argentina',
            'En el Mar Caribe',
            'Al norte de la Antártida, en aguas internacionales'
        ],
        correct: 1,
        explain: 'Las Islas Malvinas se encuentran en el Atlántico Sur, sobre la plataforma continental argentina, a unos 600 km de la costa.'
    },
    {
        q: '¿Cómo se llama la capital de las Islas Malvinas según la Argentina?',
        opts: ['Stanley', 'Puerto Argentino', 'Puerto Soledad', 'Río Gallegos'],
        correct: 1,
        explain: 'Argentina denomina a la capital "Puerto Argentino"; el Reino Unido la llama "Stanley".'
    },
    {
        q: '¿En qué año tomó posesión militar Gran Bretaña de las Islas Malvinas?',
        opts: ['1810', '1816', '1833', '1845'],
        correct: 2,
        explain: 'El 3 de enero de 1833 la corbeta británica HMS Clio expulsó a las autoridades argentinas y ocupó las islas.'
    },
    {
        q: '¿Qué día comenzó la Guerra de Malvinas?',
        opts: ['25 de Mayo de 1982', '2 de Abril de 1982', '14 de Junio de 1982', '20 de Junio de 1982'],
        correct: 1,
        explain: 'El 2 de abril de 1982 las fuerzas argentinas desembarcaron en las islas en la "Operación Rosario".'
    },
    {
        q: '¿Cuántos días duró la guerra?',
        opts: ['38 días', '74 días', '120 días', '180 días'],
        correct: 1,
        explain: 'La guerra duró 74 días, del 2 de abril al 14 de junio de 1982.'
    },
    {
        q: '¿Quién era el presidente de facto argentino al inicio de la guerra?',
        opts: ['Jorge Rafael Videla', 'Roberto Eduardo Viola', 'Leopoldo Fortunato Galtieri', 'Reynaldo Bignone'],
        correct: 2,
        explain: 'El General Leopoldo Galtieri presidía la Junta Militar al momento del desembarco.'
    },
    {
        q: '¿Quién era la Primera Ministra del Reino Unido durante la guerra?',
        opts: ['Margaret Thatcher', 'Theresa May', 'Tony Blair', 'David Cameron'],
        correct: 0,
        explain: 'Margaret Thatcher fue Primera Ministra del Reino Unido entre 1979 y 1990.'
    },
    {
        q: '¿Qué buque argentino fue hundido el 2 de mayo de 1982 por el submarino HMS Conqueror?',
        opts: ['ARA Santísima Trinidad', 'ARA General Belgrano', 'ARA Veinticinco de Mayo', 'ARA Drummond'],
        correct: 1,
        explain: 'El crucero ARA General Belgrano fue hundido fuera de la "zona de exclusión", causando 323 muertes.'
    },
    {
        q: '¿Cuántos soldados argentinos murieron aproximadamente durante el conflicto?',
        opts: ['Cerca de 100', 'Cerca de 250', 'Cerca de 650', 'Más de 1500'],
        correct: 2,
        explain: 'Murieron 649 argentinos. A esto se suman cientos de suicidios de veteranos en los años posteriores.'
    },
    {
        q: '¿En qué fecha se rindieron las tropas argentinas en Puerto Argentino?',
        opts: ['2 de mayo de 1982', '1 de junio de 1982', '14 de junio de 1982', '10 de julio de 1982'],
        correct: 2,
        explain: 'El 14 de junio de 1982 el general Mario Benjamín Menéndez firmó la rendición.'
    },
    {
        q: 'Durante la guerra, ¿qué frase usaron los medios oficiales argentinos para describir la situación?',
        opts: [
            '"Estamos perdiendo terreno"',
            '"Estamos ganando"',
            '"Necesitamos refuerzos urgentes"',
            '"Es una guerra imposible"'
        ],
        correct: 1,
        explain: 'La revista Gente y los noticieros oficiales informaban falsamente que "Estamos ganando", manipulando a la población.'
    },
    {
        q: '¿Qué edad tenían en promedio los soldados argentinos enviados a Malvinas?',
        opts: ['25-30 años', '18-19 años (conscriptos)', '35-40 años (profesionales)', '45 años'],
        correct: 1,
        explain: 'La mayoría eran conscriptos del Servicio Militar Obligatorio, jóvenes de 18-19 años con escasa preparación.'
    },
    {
        q: 'La Constitución Nacional Argentina (1994) afirma sobre Malvinas que:',
        opts: [
            'Argentina renuncia a su soberanía',
            'Es un objetivo permanente e irrenunciable de la Nación',
            'Las islas pertenecen a Inglaterra',
            'No menciona el tema'
        ],
        correct: 1,
        explain: 'La Disposición Transitoria Primera establece que recuperar las Malvinas es objetivo permanente e irrenunciable.'
    },
    {
        q: '¿Cómo se conoce la operación argentina del 2 de abril de 1982?',
        opts: ['Operación Cóndor', 'Operación Rosario', 'Operación Soberanía', 'Operación Atlántico'],
        correct: 1,
        explain: 'La "Operación Rosario" fue el desembarco anfibio que recuperó temporalmente las islas.'
    },
    {
        q: 'Las islas son reclamadas históricamente por Argentina porque:',
        opts: [
            'Las descubrieron los argentinos',
            'Forman parte del territorio heredado de España y son ocupadas ilegítimamente desde 1833',
            'Tienen petróleo',
            'Son útiles militarmente'
        ],
        correct: 1,
        explain: 'Por el principio de uti possidetis iuris, Argentina heredó las islas de España, y la ocupación británica de 1833 fue ilegítima.'
    },
    {
        q: '¿Qué resolución de la ONU reconoce la disputa de soberanía y llama a negociar?',
        oms: 4,
        opts: ['Resolución 678', 'Resolución 2065 (XX)', 'Resolución 1325', 'Resolución 502'],
        correct: 1,
        explain: 'La Resolución 2065 (XX) de 1965 reconoció la disputa de soberanía e instó a Argentina y Reino Unido a negociar.'
    },
    {
        q: '¿Cómo influyó el clima de las islas en la guerra?',
        opts: [
            'Era cálido y favorable',
            'Frío extremo, viento y humedad afectaron a las tropas argentinas mal equipadas',
            'No fue relevante',
            'Fue similar al clima patagónico habitual'
        ],
        correct: 1,
        explain: 'El frío bajo cero, la humedad constante y el viento provocaron pie de trinchera, hipotermia y desnutrición en las tropas.'
    },
    {
        q: '¿Qué eran los "estaqueamientos" denunciados por veteranos?',
        opts: [
            'Una técnica de descanso',
            'Un castigo: dejar al soldado atado a estacas a la intemperie en el frío',
            'Un ejercicio físico',
            'Una formación militar'
        ],
        correct: 1,
        explain: 'Algunos oficiales aplicaban este castigo a soldados que tomaban comida por hambre. Es un crimen de lesa humanidad denunciado.'
    },
    {
        q: '¿Qué film argentino del 2005 mostró críticamente la experiencia de los soldados?',
        opts: ['"La historia oficial"', '"Iluminados por el fuego"', '"Camila"', '"Los rubios"'],
        correct: 1,
        explain: '"Iluminados por el fuego" (Tristán Bauer) está basado en el libro de Edgardo Esteban, ex-combatiente.'
    },
    {
        q: 'La frase "El que se olvida del pasado está condenado a repetirlo" aplicada a Malvinas significa:',
        opts: [
            'Volver a la guerra',
            'Mantener la memoria activa para defender la soberanía y honrar a los caídos',
            'Olvidar lo sucedido',
            'Que es solo un tema histórico sin importancia hoy'
        ],
        correct: 1,
        explain: 'La memoria sostiene el reclamo de soberanía, dignifica a los veteranos y protege a las nuevas generaciones.'
    }
];

const CONTAINER_STYLE = {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 1rem 4rem',
    fontFamily: '"Public Sans", -apple-system, sans-serif'
};

const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
};

const Evaluacion = () => {
    const [stage, setStage] = useState('intro'); // intro | datos | quiz | results
    const [studentData, setStudentData] = useState({
        nombre: '', apellido: '', dni: '', escuela: '', curso: '', edad: '', email: ''
    });
    const [answers, setAnswers] = useState({});
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
    const [submittedRecords, setSubmittedRecords] = useState([]);
    const [results, setResults] = useState(null);
    const startTimeRef = useRef(null);
    const timerRef = useRef(null);

    // cargar registros previos
    useEffect(() => {
        const saved = localStorage.getItem('malvinas_evaluacion_records');
        if (saved) {
            try { setSubmittedRecords(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, []);

    const submitQuiz = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);

        let correct = 0;
        const detail = QUESTIONS.map((q, idx) => {
            const sel = answers[idx];
            const ok = sel === q.correct;
            if (ok) correct++;
            return { idx, selected: sel, correct: q.correct, ok };
        });
        const score = (correct / QUESTIONS.length) * 100;
        const elapsed = QUIZ_DURATION - timeLeft;

        const record = {
            timestamp: new Date().toISOString(),
            student: studentData,
            score,
            correct,
            total: QUESTIONS.length,
            timeSpent: elapsed,
            answers: detail
        };

        const updated = [...submittedRecords, record];
        setSubmittedRecords(updated);
        localStorage.setItem('malvinas_evaluacion_records', JSON.stringify(updated));

        setResults(record);
        setStage('results');
    }, [answers, studentData, submittedRecords, timeLeft]);

    // timer
    useEffect(() => {
        if (stage !== 'quiz') return;
        if (startTimeRef.current === null) startTimeRef.current = Date.now();

        timerRef.current = setInterval(() => {
            setTimeLeft((t) => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    submitQuiz();
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timerRef.current);
    }, [stage, submitQuiz]);

    const startQuiz = () => {
        // valida campos mínimos
        const required = ['nombre', 'apellido', 'escuela', 'curso', 'edad'];
        for (const f of required) {
            if (!studentData[f]?.toString().trim()) {
                alert(`Completá el campo "${f}" antes de comenzar.`);
                return;
            }
        }
        setStage('quiz');
        setTimeLeft(QUIZ_DURATION);
        startTimeRef.current = null;
    };

    const goPrev = () => setCurrentIdx(i => Math.max(0, i - 1));
    const goNext = () => setCurrentIdx(i => Math.min(QUESTIONS.length - 1, i + 1));
    const goTo = (idx) => setCurrentIdx(idx);
    const select = (opt) => setAnswers(a => ({ ...a, [currentIdx]: opt }));

    const downloadResults = (format) => {
        if (!results) return;
        if (format === 'json') {
            const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `malvinas_${studentData.apellido}_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            // CSV
            const rows = [
                ['timestamp', 'apellido', 'nombre', 'dni', 'escuela', 'curso', 'edad', 'email', 'puntaje', 'correctas', 'total', 'tiempo_seg'].join(','),
                [
                    results.timestamp,
                    results.student.apellido,
                    results.student.nombre,
                    results.student.dni,
                    results.student.escuela,
                    results.student.curso,
                    results.student.edad,
                    results.student.email,
                    results.score.toFixed(1),
                    results.correct,
                    results.total,
                    results.timeSpent
                ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')
            ].join('\n');
            const blob = new Blob([rows], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `malvinas_${studentData.apellido}_${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const downloadAllRecords = () => {
        if (submittedRecords.length === 0) return;
        const header = ['timestamp', 'apellido', 'nombre', 'dni', 'escuela', 'curso', 'edad', 'email', 'puntaje', 'correctas', 'total', 'tiempo_seg'];
        const rows = [header.join(',')];
        for (const r of submittedRecords) {
            rows.push([
                r.timestamp,
                r.student.apellido, r.student.nombre, r.student.dni,
                r.student.escuela, r.student.curso, r.student.edad, r.student.email,
                r.score.toFixed(1), r.correct, r.total, r.timeSpent
            ].map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `malvinas_evaluaciones_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const restartAll = () => {
        setStage('intro');
        setAnswers({});
        setCurrentIdx(0);
        setResults(null);
        setStudentData({ nombre: '', apellido: '', dni: '', escuela: '', curso: '', edad: '', email: '' });
        setTimeLeft(QUIZ_DURATION);
        startTimeRef.current = null;
    };

    // === STAGE: INTRO ===
    if (stage === 'intro') {
        return (
            <div style={CONTAINER_STYLE}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>
                <motion.header
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: `linear-gradient(135deg, ${COLORS.base} 0%, ${COLORS.deep} 100%)`,
                        color: COLORS.paper,
                        borderRadius: '22px',
                        padding: 'clamp(2.5rem, 6vw, 4rem) 2rem',
                        marginTop: '1rem'
                    }}
                >
                    <div style={{ display: 'inline-block', padding: '0.35rem 1rem', border: `1px solid ${COLORS.accent}`, borderRadius: '999px', fontSize: '0.7rem', letterSpacing: '3px', fontWeight: 700, color: COLORS.accent, textTransform: 'uppercase', marginBottom: '1rem' }}>
                        Evaluación cronometrada
                    </div>
                    <h1 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3.4rem)', margin: 0, fontWeight: 700, lineHeight: 1.1 }}>
                        Malvinas: <span style={{ color: COLORS.accent, fontStyle: 'italic' }}>20 preguntas</span>
                    </h1>
                    <p style={{ fontSize: '1.05rem', maxWidth: '650px', marginTop: '1rem', opacity: 0.95, lineHeight: 1.6 }}>
                        Una evaluación de <strong>20 preguntas</strong> múltiple choice sobre la historia, contexto y memoria de Malvinas.
                        Tenés <strong>15 minutos</strong> para completarla.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginTop: '1.75rem' }}>
                        {[
                            { label: 'Preguntas', value: '20' },
                            { label: 'Tiempo', value: '15:00 min' },
                            { label: 'Formato', value: 'Multiple choice' },
                            { label: 'Auto-envío', value: 'Sí, al expirar' }
                        ].map(({ label, value }) => (
                            <div key={label} style={{ background: 'rgba(240,236,229,0.08)', border: '1px solid rgba(240,236,229,0.18)', borderRadius: '12px', padding: '0.7rem 1rem' }}>
                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky }}>{label}</div>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{value}</div>
                            </div>
                        ))}
                    </div>
                </motion.header>

                <section style={{ background: COLORS.paper, color: COLORS.base, borderRadius: '18px', padding: '2rem', marginTop: '1.5rem' }}>
                    <h2 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', color: COLORS.deep, fontSize: '1.6rem', margin: 0 }}>Cómo funciona</h2>
                    <ul style={{ marginTop: '1rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
                        <li>Se carga primero los datos del estudiante (nombre, escuela, curso, etc.)</li>
                        <li>Una vez iniciada, se activa un cronómetro de 15 minutos.</li>
                        <li>Las preguntas se navegan con los botones <strong>Anterior</strong> / <strong>Siguiente</strong>.</li>
                        <li>Cada pregunta tiene 4 opciones; se puede cambiar la respuesta antes de entregar.</li>
                        <li>Al finalizar (o al expirar el tiempo) se muestra el puntaje y la revisión por pregunta.</li>
                        <li>Los datos quedan guardados en este dispositivo y se pueden descargar como CSV o JSON.</li>
                    </ul>
                    <button
                        onClick={() => setStage('datos')}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.9rem 1.5rem',
                            background: COLORS.accent,
                            color: COLORS.paper,
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '1rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        Comenzar <ChevronRight size={18} />
                    </button>
                </section>

                {submittedRecords.length > 0 && (
                    <section style={{ background: '#fff', border: `1px solid ${COLORS.deep}`, borderRadius: '14px', padding: '1.25rem', marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <h3 style={{ margin: 0, color: COLORS.deep, fontSize: '1rem' }}>Registros guardados en este dispositivo</h3>
                            <button onClick={downloadAllRecords} style={{ background: COLORS.deep, color: COLORS.paper, border: 'none', borderRadius: '8px', padding: '0.5rem 0.85rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Download size={14} /> Exportar todos (CSV)
                            </button>
                        </div>
                        <div style={{ marginTop: '0.75rem', maxHeight: '180px', overflowY: 'auto', fontSize: '0.85rem' }}>
                            {submittedRecords.slice().reverse().map((r, i) => (
                                <div key={i} style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '0.5rem' }}>
                                    <div>{r.student.apellido}, {r.student.nombre} · {r.student.escuela} ({r.student.curso})</div>
                                    <div style={{ color: r.score >= 60 ? '#2e7d32' : '#c62828', fontWeight: 700 }}>{r.score.toFixed(1)} pts</div>
                                    <div style={{ color: '#666' }}>{new Date(r.timestamp).toLocaleString('es-AR', { hour12: false }).slice(0, 16)}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        );
    }

    // === STAGE: DATOS ===
    if (stage === 'datos') {
        return (
            <div style={CONTAINER_STYLE}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap');`}</style>
                <section style={{ background: COLORS.paper, color: COLORS.base, borderRadius: '22px', padding: '2rem', marginTop: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <User size={28} color={COLORS.accent} />
                        <h1 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', color: COLORS.deep, margin: 0, fontSize: '1.8rem' }}>
                            Datos del estudiante
                        </h1>
                    </div>
                    <p style={{ color: COLORS.base, lineHeight: 1.6 }}>
                        Antes de comenzar, completá tus datos. Quedan guardados en tu dispositivo junto con el resultado.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                        {[
                            { key: 'nombre', label: 'Nombre *' },
                            { key: 'apellido', label: 'Apellido *' },
                            { key: 'dni', label: 'DNI' },
                            { key: 'escuela', label: 'Escuela *' },
                            { key: 'curso', label: 'Curso / División *' },
                            { key: 'edad', label: 'Edad *', type: 'number' },
                            { key: 'email', label: 'Email (opcional)', type: 'email' }
                        ].map(({ key, label, type }) => (
                            <label key={key} style={{ display: 'block' }}>
                                <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: COLORS.deep, marginBottom: '0.3rem' }}>{label}</span>
                                <input
                                    type={type || 'text'}
                                    value={studentData[key]}
                                    onChange={(e) => setStudentData({ ...studentData, [key]: e.target.value })}
                                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: `1px solid ${COLORS.sky}`, background: '#fff', fontSize: '0.95rem', fontFamily: 'inherit' }}
                                />
                            </label>
                        ))}
                    </div>
                    <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button onClick={() => setStage('intro')} style={{ padding: '0.75rem 1.25rem', background: 'transparent', color: COLORS.deep, border: `1px solid ${COLORS.deep}`, borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>
                            ← Volver
                        </button>
                        <button onClick={startQuiz} style={{ padding: '0.85rem 1.5rem', background: COLORS.accent, color: COLORS.paper, border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            Iniciar examen <Clock size={16} />
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    // === STAGE: QUIZ ===
    if (stage === 'quiz') {
        const q = QUESTIONS[currentIdx];
        const selected = answers[currentIdx];
        const answeredCount = Object.keys(answers).length;
        const lowTime = timeLeft <= 60;

        return (
            <div style={CONTAINER_STYLE}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap');`}</style>
                {/* Header con timer */}
                <div style={{
                    background: COLORS.base,
                    color: COLORS.paper,
                    borderRadius: '18px 18px 0 0',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    marginTop: '1rem'
                }}>
                    <div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky }}>Pregunta</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{currentIdx + 1} / {QUESTIONS.length}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky }}>Respondidas</div>
                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: COLORS.accent }}>{answeredCount} / {QUESTIONS.length}</div>
                    </div>
                    <div style={{
                        background: lowTime ? COLORS.accent : 'rgba(240,236,229,0.08)',
                        border: `1px solid ${lowTime ? COLORS.accent : 'rgba(240,236,229,0.2)'}`,
                        borderRadius: '12px',
                        padding: '0.4rem 0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        animation: lowTime ? 'pulse 1s infinite' : 'none'
                    }}>
                        <Clock size={18} />
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeLeft)}</span>
                    </div>
                </div>

                {/* progress + dots */}
                <div style={{ background: '#222', height: '4px' }}>
                    <div style={{ background: COLORS.accent, height: '100%', width: `${(answeredCount / QUESTIONS.length) * 100}%`, transition: 'width 0.3s' }} />
                </div>

                <div style={{
                    background: COLORS.paper,
                    color: COLORS.base,
                    padding: '1.5rem',
                    display: 'flex',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                    justifyContent: 'center'
                }}>
                    {QUESTIONS.map((_, i) => {
                        const isAns = answers[i] !== undefined;
                        const isCur = i === currentIdx;
                        return (
                            <button key={i} onClick={() => goTo(i)} title={`Pregunta ${i + 1}`}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem',
                                    background: isCur ? COLORS.accent : isAns ? COLORS.deep : '#cfd5dc',
                                    color: isCur || isAns ? COLORS.paper : COLORS.base,
                                    transform: isCur ? 'scale(1.15)' : 'scale(1)',
                                    transition: 'all 0.2s'
                                }}>
                                {i + 1}
                            </button>
                        );
                    })}
                </div>

                {/* Question content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIdx}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            background: COLORS.paper,
                            color: COLORS.base,
                            padding: '2rem 1.5rem',
                            borderRadius: '0 0 18px 18px'
                        }}
                    >
                        <p style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', fontSize: '1.4rem', color: COLORS.deep, fontWeight: 700, margin: 0, lineHeight: 1.4 }}>
                            {q.q}
                        </p>
                        <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {q.opts.map((opt, i) => {
                                const isSel = selected === i;
                                return (
                                    <label key={i}
                                        onClick={() => select(i)}
                                        style={{
                                            cursor: 'pointer',
                                            background: isSel ? COLORS.deep : '#fff',
                                            color: isSel ? COLORS.paper : COLORS.base,
                                            border: `2px solid ${isSel ? COLORS.deep : '#dde2e8'}`,
                                            borderRadius: '12px',
                                            padding: '0.85rem 1rem',
                                            display: 'flex', alignItems: 'center', gap: '0.85rem',
                                            transition: 'all 0.15s'
                                        }}>
                                        <span style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: isSel ? COLORS.accent : '#eef0f3',
                                            color: isSel ? COLORS.paper : COLORS.deep,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 800, fontSize: '0.9rem', flexShrink: 0
                                        }}>{String.fromCharCode(65 + i)}</span>
                                        <span style={{ flex: 1, fontSize: '0.95rem' }}>{opt}</span>
                                    </label>
                                );
                            })}
                        </div>

                        {/* nav */}
                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button onClick={goPrev} disabled={currentIdx === 0}
                                style={{ padding: '0.75rem 1rem', background: '#cfd5dc', color: COLORS.deep, border: 'none', borderRadius: '10px', fontWeight: 700, cursor: currentIdx === 0 ? 'not-allowed' : 'pointer', opacity: currentIdx === 0 ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                <ChevronLeft size={16} /> Anterior
                            </button>
                            {currentIdx === QUESTIONS.length - 1 ? (
                                <button onClick={() => {
                                    const missing = QUESTIONS.length - Object.keys(answers).length;
                                    if (missing > 0 && !confirm(`Quedan ${missing} preguntas sin responder. ¿Entregar de todos modos?`)) return;
                                    submitQuiz();
                                }}
                                    style={{ padding: '0.85rem 1.5rem', background: COLORS.accent, color: COLORS.paper, border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <Send size={16} /> Entregar
                                </button>
                            ) : (
                                <button onClick={goNext}
                                    style={{ padding: '0.75rem 1rem', background: COLORS.deep, color: COLORS.paper, border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                                    Siguiente <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>

                <style>{`@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }`}</style>
            </div>
        );
    }

    // === STAGE: RESULTS ===
    if (stage === 'results' && results) {
        return (
            <div style={CONTAINER_STYLE}>
                <style>{`@import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');`}</style>
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    style={{ background: `linear-gradient(135deg, ${COLORS.base}, ${COLORS.deep})`, color: COLORS.paper, borderRadius: '22px', padding: '2.5rem 1.5rem', marginTop: '1rem', textAlign: 'center' }}
                >
                    <Trophy size={56} color={COLORS.accent} />
                    <h1 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', margin: '0.5rem 0' }}>
                        {results.score >= 80 ? 'Excelente memoria' : results.score >= 60 ? 'Buen recorrido' : 'Sigue investigando'}
                    </h1>
                    <p style={{ opacity: 0.85, fontSize: '1rem' }}>
                        {studentData.nombre} {studentData.apellido} — {studentData.escuela} ({studentData.curso})
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1.5rem' }}>
                        <div style={{ background: 'rgba(240,236,229,0.1)', borderRadius: '12px', padding: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky }}>Puntaje</div>
                            <div style={{ fontWeight: 900, fontSize: '2.4rem', color: results.score >= 60 ? '#a5d6a7' : '#ef9a9a' }}>{results.score.toFixed(0)}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>/ 100</div>
                        </div>
                        <div style={{ background: 'rgba(240,236,229,0.1)', borderRadius: '12px', padding: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky }}>Correctas</div>
                            <div style={{ fontWeight: 900, fontSize: '2.4rem' }}>{results.correct}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>/ {results.total}</div>
                        </div>
                        <div style={{ background: 'rgba(240,236,229,0.1)', borderRadius: '12px', padding: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', color: COLORS.sky }}>Tiempo</div>
                            <div style={{ fontWeight: 900, fontSize: '2.4rem' }}>{formatTime(results.timeSpent)}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>min:seg</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => downloadResults('csv')} style={{ background: COLORS.accent, color: COLORS.paper, border: 'none', borderRadius: '10px', padding: '0.7rem 1.1rem', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Download size={14} /> CSV
                        </button>
                        <button onClick={() => downloadResults('json')} style={{ background: 'transparent', color: COLORS.paper, border: `1px solid ${COLORS.paper}`, borderRadius: '10px', padding: '0.7rem 1.1rem', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Download size={14} /> JSON
                        </button>
                        <button onClick={restartAll} style={{ background: COLORS.sky, color: COLORS.base, border: 'none', borderRadius: '10px', padding: '0.7rem 1.1rem', cursor: 'pointer', fontWeight: 700 }}>
                            Hacer otra
                        </button>
                    </div>
                </motion.div>

                {/* Revisión */}
                <section style={{ background: COLORS.paper, borderRadius: '18px', padding: '1.5rem', marginTop: '1.5rem' }}>
                    <h2 style={{ fontFamily: '"EFCO Brookshire", "Playfair Display", Georgia, serif', color: COLORS.deep, marginTop: 0, fontSize: '1.5rem' }}>
                        <BookOpen size={22} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        Revisión por pregunta
                    </h2>
                    {QUESTIONS.map((q, idx) => {
                        const sel = answers[idx];
                        const ok = sel === q.correct;
                        return (
                            <div key={idx} style={{ borderLeft: `4px solid ${ok ? '#2e7d32' : '#c62828'}`, background: '#fff', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    {ok ? <CheckCircle color="#2e7d32" size={18} /> : <XCircle color="#c62828" size={18} />}
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#666', fontWeight: 700 }}>Pregunta {idx + 1}</span>
                                </div>
                                <div style={{ fontWeight: 700, color: COLORS.deep }}>{q.q}</div>
                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    {q.opts.map((opt, i) => {
                                        const isCorrect = i === q.correct;
                                        const isSel = i === sel;
                                        return (
                                            <div key={i} style={{
                                                padding: '0.4rem 0.6rem',
                                                background: isCorrect ? 'rgba(46,125,50,0.12)' : isSel ? 'rgba(198,40,40,0.1)' : 'transparent',
                                                color: isCorrect ? '#1b5e20' : isSel ? '#b71c1c' : COLORS.base,
                                                borderRadius: '6px', fontSize: '0.85rem'
                                            }}>
                                                {String.fromCharCode(65 + i)}. {opt}
                                                {isCorrect && ' ✓'} {isSel && !isCorrect && ' ← Tu respuesta'}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(53,68,106,0.07)', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.deep }}>
                                    <AlertCircle size={14} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }} />
                                    {q.explain}
                                </div>
                            </div>
                        );
                    })}
                </section>
            </div>
        );
    }

    return null;
};

export default Evaluacion;
