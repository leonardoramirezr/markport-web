import { describe, expect, it } from 'vitest';
import { A4, length, parse } from '../src/lib/page-setup';

describe('length', () => {
	it('converts CSS units to points', () => {
		expect(length('1in')).toBeCloseTo(72);
		expect(length('25.4mm')).toBeCloseTo(72);
		expect(length('2.54cm')).toBeCloseTo(72);
		expect(length('12pt')).toBe(12);
		expect(length('16px')).toBe(12);
		expect(length('10')).toBe(10);
		expect(length('auto')).toBeNull();
	});
});

describe('parse', () => {
	it('falls back to A4 without an @page rule', () => {
		expect(parse('body { color: red }')).toEqual(A4);
	});

	it('reads a named size and a shorthand margin', () => {
		const page = parse('@page { size: Letter; margin: 0.7cm 1cm; }');
		expect(page.label).toBe('Letter');
		expect(page.width).toBe(612);
		expect(page.height).toBe(792);
		expect(page.top).toBeCloseTo(19.84, 1);
		expect(page.left).toBeCloseTo(28.35, 1);
	});

	it('swaps the axes for landscape', () => {
		const page = parse('@page { size: A4 landscape; }');
		expect(page.landscape).toBe(true);
		expect(page.width).toBeGreaterThan(page.height);
	});

	it('accepts explicit measurements and per-side margins', () => {
		const page = parse('@page { size: 200mm 300mm; margin: 1cm; margin-left: 3cm; }');
		expect(page.label).toBe('Custom');
		expect(page.width).toBeCloseTo(566.93, 1);
		expect(page.left).toBeCloseTo(85.04, 1);
		expect(page.right).toBeCloseTo(28.35, 1);
	});

	it('only reads the first @page block', () => {
		const page = parse('@page { size: A5 } @page :first { size: Legal }');
		expect(page.label).toBe('A5');
	});
});
