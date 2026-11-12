export class Colour {
    readonly red = "#EF3022";
    readonly orange = "#FDCA35";
    readonly green = "#3A9F4B";
}

export function interpolateColor(
    color1: string,
    color2: string,
    factor: number
): string {
    const hexToRgb = (hex: string): number[] => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16)
    ];

    const rgbToHex = (rgb: number[]): string =>
        "#" + rgb.map(v =>
            Math.round(v).toString(16).padStart(2, "0")
        ).join("").toUpperCase();

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    const clampedFactor = Math.max(0, Math.min(1, factor));

    const result = c1.map((v, i) =>
        v + (c2[i] - v) * clampedFactor
    );

    return rgbToHex(result);
}

