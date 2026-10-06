import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { inputSanitizer } from '../middleware/input-sanitizer.js';

const correr = (body: unknown): { status: number | null; siguio: boolean } => {
  const req = {
    path: '/api/executive/tools/guion',
    query: {},
    body,
    headers: {},
    ip: '127.0.0.1',
  } as unknown as Request;
  let status: number | null = null;
  const res = {
    status: (code: number) => {
      status = code;
      return res;
    },
    json: () => res,
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  inputSanitizer(req, res, next);
  return { status, siguio: (next as unknown as ReturnType<typeof vi.fn>).mock.calls.length > 0 };
};

describe('inputSanitizer · saltos de línea', () => {
  it('admite saltos de línea en la transcripción de un guion', () => {
    expect(correr({ transcripcion: '[00:00] hola\n[00:03] chau' })).toEqual({ status: null, siguio: true });
  });

  it('admite saltos de línea en el caption de Safety Check', () => {
    expect(correr({ caption: 'Primera línea\nSegunda línea' }).siguio).toBe(true);
  });

  it('sigue rechazando saltos de línea en un campo que no es de texto libre', () => {
    expect(correr({ plataforma: 'instagram\r\nSet-Cookie: x=1' })).toEqual({ status: 400, siguio: false });
  });

  it('sigue rechazando un byte nulo aunque el campo sea multilínea', () => {
    expect(correr({ transcripcion: 'hola\u0000chau' })).toEqual({ status: 400, siguio: false });
  });

  it('sigue rechazando un script aunque el campo sea multilínea', () => {
    expect(correr({ contenido: 'mirá\n<script>alert(1)</script>' })).toEqual({ status: 400, siguio: false });
  });
});
