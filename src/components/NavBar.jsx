import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Compass, Flag, ClipboardList, Gamepad2, Box } from 'lucide-react';

const COLORS = {
    base: '#09090c',
    accent: '#b45354',
    sky: '#7b98ab',
    deep: '#35446a',
    paper: '#f0ece5'
};

const NavBar = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const location = useLocation();

    const links = [
        { name: 'Visión General', path: '/', icon: Flag },
        { name: 'Juego Serio', path: '/juego', icon: Gamepad2 },
        { name: 'Diorama 3D', path: '/ra', icon: Box },
        { name: 'Evaluación', path: '/evaluacion', icon: ClipboardList }
    ];

    return (
        <nav style={{
            background: COLORS.base,
            borderBottom: `1px solid ${COLORS.deep}`,
            padding: '0.75rem 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 1000
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.deep})`,
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(180,83,84,0.3)'
                    }}>
                        <Compass size={24} color={COLORS.paper} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.25rem', color: COLORS.paper, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>Malvinas</h1>
                        <p style={{ fontSize: '0.65rem', color: COLORS.sky, margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>En primera persona</p>
                    </div>
                </Link>

                {/* Desktop Menu */}
                <div style={{ display: 'none', gap: '0.5rem', alignItems: 'center' }} className="desktop-only">
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path;
                        return (
                            <Link 
                                key={link.path} 
                                to={link.path} 
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: isActive ? COLORS.accent : COLORS.paper,
                                    background: isActive ? 'rgba(180,83,84,0.1)' : 'transparent',
                                    padding: '0.55rem 0.85rem',
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={18} /> {link.name}
                            </Link>
                        );
                    })}
                </div>

                {/* Mobile Toggle */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{ border: 'none', background: 'none', color: COLORS.paper }}
                    className="mobile-only"
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div
                    style={{
                        padding: '1.5rem',
                        background: COLORS.base,
                        borderTop: `1px solid ${COLORS.deep}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        maxHeight: '80vh',
                        overflowY: 'auto'
                    }}
                    className="mobile-only"
                >
                    {links.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.path;
                        return (
                            <Link
                                key={link.path}
                                to={link.path}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    textDecoration: 'none',
                                    color: isActive ? COLORS.accent : COLORS.paper,
                                    fontWeight: 900,
                                    padding: '0.85rem 1rem',
                                    background: isActive ? 'rgba(180,83,84,0.1)' : 'transparent',
                                    borderRadius: '10px'
                                }}
                            >
                                <Icon size={20} /> {link.name}
                            </Link>
                        );
                    })}
                </div>
            )}

            <style>{`
                .desktop-only { display: flex !important; }
                .mobile-only { display: none !important; }
                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: block !important; }
                }
            `}</style>
        </nav>
    );
};

export default NavBar;
