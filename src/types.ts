import type { restArgs, thisArg } from './symbols'

type ItemOf<Arr extends Array<any>> =
	Arr extends Array<infer T>
		? T
		: never
type IsNotTuple<Arr extends Array<any>> =
	Array<ItemOf<Arr>> extends Arr
		? true
		: false
type CollectIncludeOptional<Tuple extends Array<any>> =
	IsNotTuple<Tuple> extends true
		? []
		: Tuple extends []
			? []
			: Tuple extends [(infer First)?, ...infer Rest]
				? [First, ...CollectIncludeOptional<Rest>]
				: never
type DropFirst<Tuple extends Array<any>> =
	Tuple extends [infer _, ...infer Rest]
		? Rest
		: never
type MakeAllOptional<Tuple extends Array<any>> =
	IsNotTuple<Tuple> extends true
		? []
		: Tuple extends []
			? []
			: Tuple extends [(infer First)?, ...infer Rest]
				? [First?, ...MakeAllOptional<Rest>]
				: never

export type AnyFn = (...args: any) => any
export type MaxStaticArgsOf<Fn extends AnyFn> =
	CollectIncludeOptional<Parameters<Fn>>
export type TakeCount<Fn extends AnyFn> =
	MakeAllOptional<DropFirst<MaxStaticArgsOf<Fn>>>['length']

export type ParameterPosition = number | typeof thisArg | typeof restArgs
