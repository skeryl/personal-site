import { describe, test, expect } from 'vitest';
import { capitalize, toCamelCase } from './post-summarizer';

describe('post-summarizer', () => {
	describe('capitalize', () => {
		test('should capitalize a word', () => {
			expect(capitalize('test')).toEqual('Test');
		});
	});

	describe('toCamelCase', () => {
		test('should camelCase a kebab string', () => {
			expect(toCamelCase('ant-farm')).toEqual('antFarm');
		});
		test('should camelCase a kebab filename (without stripping extension)', () => {
			expect(toCamelCase('ant-farm.ts')).toEqual('antFarm.ts');
		});
	});
});
