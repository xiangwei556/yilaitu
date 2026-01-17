
export interface LabColor {
  l: number;
  a: number;
  b: number;
}

/**
 * 将 RGB 转换为 CIELAB 色彩空间，以便进行符合视觉感知的色差计算
 */
export function rgbToLab(r: number, g: number, b: number): LabColor {
  // 1. Normalize RGB values
  let rf = r / 255;
  let gf = g / 255;
  let bf = b / 255;

  // 2. Linearize sRGB
  rf = rf > 0.04045 ? Math.pow((rf + 0.055) / 1.055, 2.4) : rf / 12.92;
  gf = gf > 0.04045 ? Math.pow((gf + 0.055) / 1.055, 2.4) : gf / 12.92;
  bf = bf > 0.04045 ? Math.pow((bf + 0.055) / 1.055, 2.4) : bf / 12.92;

  // 3. Convert to XYZ
  let x = (rf * 0.4124 + gf * 0.3576 + bf * 0.1805) * 100;
  let y = (rf * 0.2126 + gf * 0.7152 + bf * 0.0722) * 100;
  let z = (rf * 0.0193 + gf * 0.1192 + bf * 0.9505) * 100;

  // 4. XYZ to Lab (D65 illuminant)
  x /= 95.047;
  y /= 100.0;
  z /= 108.883;

  const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : 7.787 * t + 16 / 116);

  return {
    l: 116 * f(y) - 16,
    a: 500 * (f(x) - f(y)),
    b: 200 * (f(y) - f(z)),
  };
}

/**
 * 计算两个 CIELAB 颜色的欧式距离 (CIE76)
 */
export function deltaE(lab1: LabColor, lab2: LabColor): number {
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}
