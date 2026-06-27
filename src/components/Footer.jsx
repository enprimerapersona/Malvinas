import React from 'react';
import { Compass } from 'lucide-react';

const COLORS = {
    base: '#09090c',
    accent: '#b45354',
    sky: '#7b98ab',
    deep: '#35446a',
    paper: '#f0ece5'
};

const Footer = () => {
  return (
    <footer style={{ 
      background: COLORS.base, 
      padding: '3rem 1rem', 
      borderTop: `1px solid ${COLORS.deep}`,
      marginTop: 'auto',
      color: COLORS.paper
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.deep})`, 
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(180,83,84,0.3)'
          }}>
            <Compass size={28} color={COLORS.paper} />
          </div>
        </div>
        <h3 style={{ color: COLORS.paper, marginBottom: '0.25rem', fontSize: '1.5rem', fontWeight: 900 }}>Malvinas</h3>
        <p style={{ fontSize: '0.9rem', color: COLORS.sky, marginBottom: '0.5rem' }}>
          En primera persona – Proyecto Narrativo Transmedia
        </p>
        <div style={{ display: 'inline-block', background: 'rgba(180,83,84,0.15)', borderRadius: '20px', padding: '0.35rem 1.25rem', fontSize: '0.8rem', color: COLORS.accent, fontWeight: 700, marginBottom: '2rem' }}>
          Recurso Didáctico sobre la Memoria e Identidad Nacional
        </div>

        <div style={{ borderTop: `1px solid ${COLORS.deep}`, paddingTop: '1.5rem', opacity: 0.8 }}>
          <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>
            Malvinas en primera persona · Proyecto Transmedia
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: COLORS.sky, opacity: 0.8, fontWeight: 700 }}>v1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
