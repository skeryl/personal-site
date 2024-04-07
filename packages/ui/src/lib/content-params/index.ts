export enum ParamType {
	number = 'number',
	string = 'string',
	vec2 = 'vec2'
}

interface Range {
	min: number;
	max: number;
	step?: number | 'any';
}

export type Vec2 = [number, number];
export type ParamValue<T extends ParamType> = T extends ParamType.number
	? number
	: T extends ParamType.vec2
		? Vec2
		: string;

export type ParamRange<T extends ParamType> = T extends ParamType.number
	? Range
	: T extends ParamType.vec2
		? [Range, Range]
		: never;

export interface ContentParam<T extends ParamType> {
	name: string;
	id: string;
	type: T;
	defaultValue: ParamValue<T>;
	value: ParamValue<T>;
	range?: ParamRange<T>;
}

export function numberParam(
	name: string,
	defaultValue: number,
	range?: Range,
	id: string = name.replace(/\s/g, '-').toLowerCase()
): ContentParam<ParamType.number> {
	return {
		value: defaultValue,
		defaultValue: defaultValue,
		type: ParamType.number,
		name,
		id,
		range
	};
}

export function createParam<T extends ParamType>(
	name: string,
	type: T,
	defaultValue: ParamValue<T>,
	range?: ParamRange<T>,
	id: string = name.replace(/\s/g, '-').toLowerCase()
): ContentParam<T> {
	return {
		value: defaultValue,
		defaultValue: defaultValue,
		type,
		name,
		id,
		range
	};
}

export type ContentParams = ContentParam<ParamType>[];

export function paramsById(params: ContentParams): Record<string, ContentParam<ParamType>> {
	return params.reduce<Record<string, ContentParam<ParamType>>>(
		(res, param) => ({ ...res, [param.id]: param }),
		{}
	);
}
