import { useCallback, useEffect, useRef } from 'react';
import { PeriodicTableScene, type LayoutName } from '../three/PeriodicTableScene';

export function usePeriodicScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PeriodicTableScene | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new PeriodicTableScene(el);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const setLayout = useCallback((layout: LayoutName) => {
    sceneRef.current?.transform(layout);
  }, []);

  return { containerRef, setLayout };
}
