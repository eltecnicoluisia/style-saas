import React, { useEffect, useRef } from 'react';

// ============================================================================
// Colección de 32 Vectores de Alta Definición para Estética, Belleza y Barbería
// Normalizados para coordenadas 24x24
// ============================================================================
export const AESTHETIC_VECTOR_PATHS: Record<string, string> = {
  // 1. Tijeras de corte profesional
  scissors: 'M6 4a3 3 0 1 0 2.8 4l2.4 2.4-2.4 2.4A3 3 0 1 0 6 20a3 3 0 0 0 2.8-2L12 14.8l7.6 7.6 1.4-1.4L13.4 13.4l7.6-7.6-1.4-1.4L12 12 8.8 6A3 3 0 0 0 6 4zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0 10a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  
  // 2. Máquina de afeitar / Clipper eléctrica
  clipper: 'M8 2h8v3H8V2zm-2 4h12a1 1 0 0 1 1 1v12a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V7a1 1 0 0 1 1-1zm3 4v6h2v-6H9zm4 0v6h2v-6h-2z',
  
  // 3. Navaja de barbero clásica (Straight Razor)
  straight_razor: 'M3 17l10-10 1.4 1.4-10 10zm11.5-8.5l4-4a2 2 0 0 1 2.8 2.8l-4 4-2.8-2.8zM4 19a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  
  // 4. Peine de corte (Comb)
  comb: 'M2 6h20a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm2 6v6h2v-6H4zm4 0v6h2v-6H8zm4 0v6h2v-6h-2zm4 0v6h2v-6h-2z',
  
  // 5. Secador de cabello (Blow Dryer)
  hair_dryer: 'M3 6h9a5 5 0 0 1 5 5v1h4v3h-4v1a4 4 0 0 1-4 4h-2l-2 4H6l2-4H3V6zm3 4v4h4a2 2 0 0 0 2-2 2 2 0 0 0-2-2H6z',
  
  // 6. Plancha de cabello (Straightener)
  hair_straightener: 'M4 4h16v3H4V4zm0 5h16v3H4V9zm0 6h4v5H4v-5zm12 0h4v5h-4v-5zM6 12l-2 8h2l2-8H6z',
  
  // 7. Rizador de cabello (Curling Iron)
  curling_iron: 'M10 2h4v12h-4V2zm-2 13h8a1 1 0 0 1 1 1v5a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-5a1 1 0 0 1 1-1zm3 3v3h2v-3h-2z',
  
  // 8. Cepillo redondo de peinar
  hairbrush: 'M8 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2v7a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-7H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm1 3v2h2V5H9zm4 0v2h2V5h-2zm-4 4v2h2V9H9zm4 0v2h2V9h-2z',
  
  // 9. Barra de labios (Lipstick)
  lipstick: 'M8 12h8v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9zm2-10h4l2 6H8l2-6zm-1 7h6v2H9V9z',
  
  // 10. Esmalte de uñas (Nail Polish)
  nail_polish: 'M10 2h4v6h-4V2zm-3 7h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zm4 4v5h2v-5h-2z',
  
  // 11. Uñas esculpidas / Manicure
  nails: 'M7 3a4 4 0 0 1 4 4v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a4 4 0 0 1 4-4zm6 4a4 4 0 0 1 4 4v9a3 3 0 0 1-3 3h-1a3 3 0 0 1-3-3v-9a4 4 0 0 1 3-4z',
  
  // 12. Pinzas de cejas (Tweezers)
  tweezers: 'M11 2h2l4 17-2 3-3-9-3 9-2-3 4-17zm1 4l-1 5h2l-1-5z',
  
  // 13. Rímel / Máscara de pestañas
  mascara: 'M10 2h4v7h-4V2zm-2 8h8v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10zm3-6h2v2h-2V4zm-1 9h4v2h-4v-2z',
  
  // 14. Brocha de maquillaje (Makeup Brush)
  makeup_brush: 'M8 2c2 0 6 3 6 6H8c0-3 0-6 0-6zm1 7h4v4H9V9zm1 5h2v7a1 1 0 0 1-1 1h0a1 1 0 0 1-1-1v-7z',
  
  // 15. Ceja definida y mirada
  eyebrow: 'M2 10c4-4 12-5 20-1-5-2-13-1-20 1zm4 5a6 6 0 0 0 12 0c-3-2-9-2-12 0z',
  
  // 16. Espejo de mano de salón
  mirror: 'M12 2a7 7 0 0 1 7 7c0 3.3-2.3 6-5.5 6.8L15 21a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1l1.5-5.2C7.3 15 5 12.3 5 9a7 7 0 0 1 7-7zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  
  // 17. Frasco de perfume atomizador
  perfume: 'M10 2h4v3h-4V2zm-3 4h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zm5 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  
  // 18. Botella de champú / loción capilar
  shampoo: 'M9 2h6v3H9V2zm-3 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm4 4v6h4v-6h-4z',
  
  // 19. Pote de crema facial / cera estilizadora
  cream_jar: 'M3 6h18v4H3V6zm2 5h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8zm4 3v3h6v-3H9z',
  
  // 20. Pinza caimán / Hair clip
  hair_clip: 'M3 8h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H3l3-4-3-4zm5 3v2h8v-2H8z',
  
  // 21. Silueta de corte de cabello moderno
  hair_cut_style: 'M12 2C7 2 5 6 5 10c0 4 2 8 4 10l3 2 3-2c2-2 4-6 4-10 0-4-2-8-7-8zm0 4a3 3 0 0 1 3 3c0 2-1 3-3 3s-3-1-3-3a3 3 0 0 1 3-3z',
  
  // 22. Peluca / Cabello largo con ondas
  wig_silhouette: 'M12 2c-4 0-7 3-7 7 0 6-2 9-2 12h3c1-2 2-5 3-7 1 3 2 5 3 7h4c1-2 2-5 3-7 1 2 2 5 3 7h3c0-3-2-6-2-12 0-4-3-7-7-7z',
  
  // 23. Poste clásico de barbero (Barber Pole)
  barber_pole: 'M8 2h8v2H8V2zm-1 3h10v14H7V5zm2 2l6 4v2l-6-4V7zm0 5l6 4v2l-6-4v-2zm-1 8h10v2H8v-2z',
  
  // 24. Bigote clásico (Mustache)
  mustache: 'M12 14c-2-3-6-4-9-2 0 3 3 6 7 5 1 0 2-1 2-3zm0 0c2-3 6-4 9-2 0 3-3 6-7 5-1 0-2-1-2-3z',
  
  // 25. Silueta de barba perfilada (Beard)
  beard: 'M6 4c0 6 2 11 6 15 4-4 6-9 6-15-2 1-4 2-6 2s-4-1-6-2zm4 7c1 1 3 1 4 0 0 1-1 2-2 2s-2-1-2-2z',
  
  // 26. Rociador de agua para barbería (Spray Bottle)
  spray_bottle: 'M9 3h4v3H9V3zm4 1l4-2v4h-2l-2-2zm-6 6h10a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2zm3 4v5h4v-5h-4z',
  
  // 27. Pincel aplicador de tinte
  hair_dye_brush: 'M9 2h6v5l-1 2v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9L9 7V2zm2 2v2h2V4h-2z',
  
  // 28. Tazón de mezcla para tinte
  hair_dye_bowl: 'M3 8h18v2c0 6-4 10-9 10S3 16 3 10V8zm2 2c0 4.5 3 8 7 8s7-3.5 7-8H5zm11-6h5v2h-5V4z',
  
  // 29. Tijeras de entresacar / microdentadas
  thinning_shears: 'M6 3a3 3 0 1 0 2.8 4L12 10.2l3.2-3.2L12 4l3-1 6 6-1.5 1.5-2-2L14 12l6 6-1.5 1.5L12 13.5l-3.2 3.7A3 3 0 1 0 6 21a3 3 0 0 0 2.8-2L12 15l-3.2-4.2L6 14A3 3 0 0 0 6 8zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm0 12a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  
  // 30. Brocha de afeitar espumera (Shaving Brush)
  shaving_brush: 'M8 2c1 0 5 2 5 6H7c0-4 0-6 1-6zm0 7h8v4H8V9zm1 5h6v7a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-7z',
  
  // 31. Difusor para rizos
  hair_blower_diffuser: 'M12 2a9 9 0 0 1 9 9v2H3v-2a9 9 0 0 1 9-9zm-5 7h2V5H7v4zm4 0h2V4h-2v5zm4 0h2V5h-2v4zm-7 8h8v3h-8v-3z',
  
  // 32. Coleta / Scrunchie de cabello
  hair_tie_scrunchie: 'M12 4c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm0 3c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5z'
};

interface Particle {
  id: number;
  key: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
}

export const AestheticFloatingVectors: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Crear instancias Path2D en memoria para máxima velocidad de dibujo (cero parseo repetido)
    const compiledPaths: Record<string, Path2D> = {};
    for (const [key, d] of Object.entries(AESTHETIC_VECTOR_PATHS)) {
      try {
        compiledPaths[key] = new Path2D(d);
      } catch (e) {
        console.warn('Error al compilar path2d:', key, e);
      }
    }

    const keys = Object.keys(compiledPaths);
    const totalKeys = keys.length;

    // Paleta cromática refinada: Oro, Ámbar, Cobre y Rosa Estética
    const colors = [
      'rgba(245, 158, 11,',  // Amber 500
      'rgba(217, 119, 6,',   // Amber 600
      'rgba(251, 191, 36,',  // Amber 400
      'rgba(244, 114, 182,', // Pink 400
      'rgba(251, 146, 60,',  // Orange 400
      'rgba(180, 83, 9,',    // Warm Amber 700
      'rgba(236, 72, 153,',  // Rose 500
    ];

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Inicializar exactamente al menos 36 partículas activas garantizando que todas las 32 figuras aparezcan
    const particles: Particle[] = [];
    const count = Math.max(34, Math.floor(width / 35)); // Entre 34 y 50 partículas según ancho de pantalla

    for (let i = 0; i < count; i++) {
      const key = keys[i % totalKeys];
      particles.push({
        id: i,
        key,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        scale: 0.85 + Math.random() * 0.65, // Escala entre ~20px y ~36px
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        opacity: 0.09 + Math.random() * 0.14, // Opacidad sutil (9% a 23%) para no colapsar la pantalla
        color: colors[i % colors.length],
      });
    }

    // Render loop ultra optimizado
    const render = () => {
      // Si la ventana está oculta (cambio de pestaña), pausamos para ahorrar CPU/Batería
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        // Rebote suave en los bordes de la pantalla
        if (p.x < -30) p.x = width + 20;
        else if (p.x > width + 30) p.x = -20;
        if (p.y < -30) p.y = height + 20;
        else if (p.y > height + 30) p.y = -20;

        const path = compiledPaths[p.key];
        if (!path) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        // Centrar respecto al viewBox de 24x24
        ctx.translate(-12, -12);

        ctx.fillStyle = `${p.color} ${p.opacity})`;
        ctx.fill(path);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ opacity: 0.95 }}
    />
  );
};
