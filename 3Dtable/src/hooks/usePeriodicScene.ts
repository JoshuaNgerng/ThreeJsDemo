import { useCallback, useEffect, useRef } from 'react';
import { PeriodicTableScene, type LayoutName } from '../three/PeriodicTableScene';
import { useSheetData } from './useSheetData';

export function usePeriodicScene() {
  const data = useSheetData();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PeriodicTableScene | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new PeriodicTableScene(el);
    scene.init(data);
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
