import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import JuegoSerio from './pages/JuegoSerio';
import Diorama3D from './pages/Diorama3D';
import Evaluacion from './pages/Evaluacion';

function AppLayout() {
  const location = useLocation();
  const isFullScreen = location.pathname === '/ra';

  if (isFullScreen) {
    return (
      <Routes>
        <Route path="/ra" element={<Diorama3D />} />
      </Routes>
    );
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar />
      <main style={{ flex: 1, padding: '2rem 1rem 4rem', background: '#09090c' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/juego" element={<JuegoSerio />} />
          <Route path="/evaluacion" element={<Evaluacion />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return <AppLayout />;
}

export default App;
