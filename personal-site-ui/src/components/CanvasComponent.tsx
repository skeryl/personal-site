import * as React from "react";
import {useEffect, useState} from "react";

export interface CanvasRendererConstructor {
    new(canvas: HTMLCanvasElement): CanvasRenderer
}

export interface CanvasRenderer {
    start(): void;
    dispose(): void;
}

export interface CanvasComponentProps {
    renderer: CanvasRendererConstructor;
    height?: number | string;
    width?: number | string;
    className?: string;
    fallback?: string;
}

export function CanvasComponent(props: CanvasComponentProps) {
    const [renderer, setRenderer] = useState<CanvasRenderer | null>(null);
    const cnvRef = React.useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if(cnvRef.current){
            const renderer = new props.renderer(cnvRef.current);
            renderer.start();
            setRenderer(renderer);
        }

        return () => {
          if(renderer){
              renderer.dispose();
          }
        };
    }, [cnvRef.current]);

    return (
        <canvas className={props.className} width={props.width} height={props.height} ref={cnvRef}>{props.fallback || null}</canvas>
    );
}
