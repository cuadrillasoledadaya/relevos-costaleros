#!/usr/bin/env node
/**
 * Generador de los iconos PNG de la PWA.
 *
 * Sin dependencias binarias ni librerías de terceros: el PNG se escribe a mano
 * (zlib + CRC32, ambos de la biblioteca estándar de Node) y el dibujo se
 * rasteriza con supermuestreo 4×4.
 *
 * Uso:
 *   node src/components/shell/pwa/generar-iconos.mjs
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const CARPETA = join(RAIZ, "public", "icons");

/* -------------------------------------------------------------------------- */
/* Codificador PNG                                                            */
/* -------------------------------------------------------------------------- */

const TABLA_CRC = (() => {
  const tabla = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tabla[n] = c;
  }
  return tabla;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = (crc >>> 8) ^ TABLA_CRC[(crc ^ buffer[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function trozo(tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const tipoBuf = Buffer.from(tipo, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tipoBuf, datos])), 0);
  return Buffer.concat([largo, tipoBuf, datos, crc]);
}

/** Codifica un buffer RGBA (4 bytes por píxel) en un PNG. */
function codificarPng(ancho, alto, rgba) {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // profundidad de 8 bits
  ihdr[9] = 6; // color truecolor con alfa (RGBA)
  ihdr[10] = 0; // compresión deflate
  ihdr[11] = 0; // filtro adaptativo
  ihdr[12] = 0; // sin entrelazado

  const crudo = Buffer.alloc((ancho * 4 + 1) * alto);
  for (let y = 0; y < alto; y += 1) {
    const destino = y * (ancho * 4 + 1);
    crudo[destino] = 0; // filtro "None"
    rgba.copy(crudo, destino + 1, y * ancho * 4, (y + 1) * ancho * 4);
  }

  return Buffer.concat([
    firma,
    trozo("IHDR", ihdr),
    trozo("IDAT", deflateSync(crudo, { level: 9 })),
    trozo("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Rasterizador mínimo                                                        */
/* -------------------------------------------------------------------------- */

const FONDO = [42, 18, 80, 255]; // violeta profundo
const BARRA = [233, 185, 73, 255]; // dorado
const FIGURA = [246, 239, 226, 255]; // crema

/** Rectángulo redondeado en coordenadas normalizadas (0..1). */
function dentroRectangulo(x, y, rect) {
  const { x: rx, y: ry, w, h } = rect;
  const radio = rect.r ?? 0;
  if (x < rx || x > rx + w || y < ry || y > ry + h) return false;
  if (radio <= 0) return true;

  const centroX = Math.min(Math.max(x, rx + radio), rx + w - radio);
  const centroY = Math.min(Math.max(y, ry + radio), ry + h - radio);
  const dx = x - centroX;
  const dy = y - centroY;
  return dx * dx + dy * dy <= radio * radio;
}

/** Círculo en coordenadas normalizadas (0..1). */
function dentroCirculo(x, y, circulo) {
  const dx = x - circulo.cx;
  const dy = y - circulo.cy;
  return dx * dx + dy * dy <= circulo.r * circulo.r;
}

/**
 * Dibuja el icono: una "anda" (barra de carga) con cinco costaleros colgando.
 * `escala` reduce el conjunto para dejar zona de seguridad (icono maskable).
 */
function formas(escala) {
  const centro = 0.5;
  const transformar = (figura) => {
    const mover = (valor) => centro + (valor - centro) * escala;
    if (figura.tipo === "circulo") {
      return {
        ...figura,
        cx: mover(figura.cx),
        cy: mover(figura.cy),
        r: figura.r * escala,
      };
    }
    return {
      ...figura,
      x: mover(figura.x),
      y: mover(figura.y),
      w: figura.w * escala,
      h: figura.h * escala,
      r: (figura.r ?? 0) * escala,
    };
  };

  const lista = [
    { tipo: "rect", x: 0.16, y: 0.26, w: 0.68, h: 0.075, r: 0.037, color: BARRA },
  ];

  const posiciones = [0.24, 0.37, 0.5, 0.63, 0.76];
  for (const x of posiciones) {
    lista.push({ tipo: "circulo", cx: x, cy: 0.45, r: 0.038, color: FIGURA });
    lista.push({ tipo: "rect", x: x - 0.028, y: 0.505, w: 0.056, h: 0.215, r: 0.028, color: FIGURA });
  }

  return lista.map(transformar);
}

/** Genera el PNG de un icono del tamaño indicado. */
function generarIcono(lado, escala, { conFondo = true } = {}) {
  const supermuestreo = 4;
  const n = lado * supermuestreo;
  const buffer = Buffer.alloc(n * n * 4);
  const lista = formas(escala);

  for (let py = 0; py < n; py += 1) {
    for (let px = 0; px < n; px += 1) {
      // Muestreo del centro del subpíxel.
      const x = (px + 0.5) / n;
      const y = (py + 0.5) / n;

      let color = conFondo ? FONDO : [0, 0, 0, 0];
      for (const forma of lista) {
        const dentro =
          forma.tipo === "circulo" ? dentroCirculo(x, y, forma) : dentroRectangulo(x, y, forma);
        if (dentro) color = forma.color;
      }

      const offset = (py * n + px) * 4;
      buffer[offset] = color[0];
      buffer[offset + 1] = color[1];
      buffer[offset + 2] = color[2];
      buffer[offset + 3] = color[3];
    }
  }

  // Reducción por promedio de bloques (antialiasing).
  const salida = Buffer.alloc(lado * lado * 4);
  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < supermuestreo; sy += 1) {
        for (let sx = 0; sx < supermuestreo; sx += 1) {
          const offset = ((y * supermuestreo + sy) * n + (x * supermuestreo + sx)) * 4;
          r += buffer[offset];
          g += buffer[offset + 1];
          b += buffer[offset + 2];
          a += buffer[offset + 3];
        }
      }
      const muestras = supermuestreo * supermuestreo;
      const destino = (y * lado + x) * 4;
      salida[destino] = Math.round(r / muestras);
      salida[destino + 1] = Math.round(g / muestras);
      salida[destino + 2] = Math.round(b / muestras);
      salida[destino + 3] = Math.round(a / muestras);
    }
  }

  return codificarPng(lado, lado, salida);
}

/* -------------------------------------------------------------------------- */

mkdirSync(CARPETA, { recursive: true });

const iconos = [
  // Iconos "any": el sistema puede recortarles los bordes.
  { archivo: "icon-192.png", lado: 192, escala: 0.78 },
  { archivo: "icon-512.png", lado: 512, escala: 0.78 },
  // Icono maskable: el contenido queda dentro de la zona de seguridad.
  { archivo: "icon-maskable-512.png", lado: 512, escala: 0.58 },
  // iOS: se recorta en círculo, por eso va con fondo completo.
  { archivo: "apple-touch-icon.png", lado: 180, escala: 0.78 },
];

for (const icono of iconos) {
  const png = generarIcono(icono.lado, icono.escala);
  writeFileSync(join(CARPETA, icono.archivo), png);
  console.log(`generado ${icono.archivo} (${icono.lado}x${icono.lado}, ${png.length} bytes)`);
}

/**
 * Favicon de la app: contenedor ICO con un PNG de 32x32 incrustado (formato
 * admitido por los navegadores desde Windows Vista). Sustituye al favicon del
 * scaffold de Next.js, que era el logo del framework.
 */
const pngFavicon = generarIcono(32, 0.78);
const cabeceraIco = Buffer.alloc(6 + 16);
cabeceraIco.writeUInt16LE(0, 0); // reservado
cabeceraIco.writeUInt16LE(1, 2); // tipo: icono
cabeceraIco.writeUInt16LE(1, 4); // número de imágenes
cabeceraIco.writeUInt8(32, 6); // ancho
cabeceraIco.writeUInt8(32, 7); // alto
cabeceraIco.writeUInt8(0, 8); // paleta
cabeceraIco.writeUInt8(0, 9); // reservado
cabeceraIco.writeUInt16LE(1, 10); // planos
cabeceraIco.writeUInt16LE(32, 12); // bits por píxel
cabeceraIco.writeUInt32LE(pngFavicon.length, 14); // tamaño de la imagen
cabeceraIco.writeUInt32LE(22, 18); // offset de la imagen
const destinoFavicon = join(RAIZ, "src", "app", "favicon.ico");
writeFileSync(destinoFavicon, Buffer.concat([cabeceraIco, pngFavicon]));
console.log(`generado src/app/favicon.ico (${pngFavicon.length + 22} bytes)`);
