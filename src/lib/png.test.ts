import { describe, expect, it } from "vitest";
import { encodePng } from "./png.ts";

// Bitwise, so this is not the table-driven version under test.
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

type Chunk = { type: string; data: Uint8Array; crc: number; crcOk: boolean };

function chunks(png: Uint8Array): Chunk[] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out: Chunk[] = [];
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at);
    const type = new TextDecoder().decode(png.subarray(at + 4, at + 8));
    const data = png.subarray(at + 8, at + 8 + length);
    const crc = view.getUint32(at + 8 + length);
    out.push({ type, data, crc, crcOk: crc === crc32(png.subarray(at + 4, at + 8 + length)) });
    at += 12 + length;
  }
  return out;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const PIXELS = Uint8Array.from({ length: 12 }, (_, i) => i + 1);

describe("encodePng", () => {
  it("starts with the PNG signature", async () => {
    const png = await encodePng(2, 2, PIXELS);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });

  it("writes IHDR, IDAT and IEND, each with a correct CRC", async () => {
    const parts = chunks(await encodePng(2, 2, PIXELS));
    expect(parts.map((p) => p.type)).toEqual(["IHDR", "IDAT", "IEND"]);
    expect(parts.map((p) => p.crcOk)).toEqual([true, true, true]);
  });

  it("ends with the well-known CRC of an empty IEND chunk", async () => {
    const iend = chunks(await encodePng(2, 2, PIXELS)).at(-1);
    expect(iend?.crc).toBe(0xae426082);
  });

  it("declares the size, 8-bit truecolor and no interlace", async () => {
    const [ihdr] = chunks(await encodePng(3, 5, new Uint8Array(45)));
    const view = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, 13);
    expect([view.getUint32(0), view.getUint32(4), ...ihdr.data.subarray(8)]).toEqual([
      3, 5, 8, 2, 0, 0, 0,
    ]);
  });

  it("holds each row after a filter byte of zero", async () => {
    const idat = chunks(await encodePng(2, 2, PIXELS))[1];
    expect([...(await inflate(idat.data))]).toEqual([0, 1, 2, 3, 4, 5, 6, 0, 7, 8, 9, 10, 11, 12]);
  });

  it("rejects pixel data of the wrong length", async () => {
    await expect(encodePng(2, 2, new Uint8Array(11))).rejects.toThrow(/size/);
  });
});
