import type { restArgsSymbol, thisArgSymbol } from './symbols.js'

export type ItemOf<Arr extends Array<any>> =
	Arr extends Array<infer T>
		? T
		: never

export type AnyFn = (...args: any) => any

type Not<X extends boolean> =
	X extends true ? false : true
type Equals<A, B> = // some black magic - https://github.com/microsoft/TypeScript/issues/27024#issuecomment-421529650
	(<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
		? true
		: false
export type IsGenericFn<Fn extends AnyFn> =
	// reconstructing a function with `Parameters` and `ReturnType` loses information about generic parameters,
	// so it is a generic function if the function is not identical to the reconstructed one.
	Not<Equals<Fn, (...args: Parameters<Fn>) => ReturnType<Fn>>>

type CollectRequiredParams<Params extends Array<any>> =
	Params extends [infer Required, ...infer Rest]
		? [Required, ...CollectRequiredParams<Rest>]
		: []
type CollectNonRestParams<Params extends Array<any>, Collected extends Array<any> = []> =
	Params extends [any?, ...infer Rest]
		? [Rest, Params] extends [Params, Rest]
			// if parameters are the same even after popping out a parameter,
			// it means only rest parameter is left or no parameters are left
			? Collected
			: CollectNonRestParams<Rest, [...Collected, ...DropTail<Params>]>
		: []
export type ContainsOptionalParams<Fn extends AnyFn> =
	CollectNonRestParams<Parameters<Fn>>['length'] extends CollectRequiredParams<Parameters<Fn>>['length']
		? false
		: true
export type NonRestParamsOf<Fn extends AnyFn> =
	Required<CollectNonRestParams<Parameters<Fn>>>
type DropFirst<Tuple extends Array<any>> =
	Tuple extends [any?, ...infer Rest]
		? Rest
		: never
type Indices<Tuple extends Array<any>> =
	Extract<
		Partial<DropFirst<Tuple>>['length'],
		NonNullable<unknown>
	>
export type AvailablePositions<
	Fn extends AnyFn,
	TakenPositions extends Array<ParameterPosition>,
	BoundPositionU extends ParameterPosition,
> =
	Exclude<Indices<NonRestParamsOf<Fn>>, ItemOf<TakenPositions> | BoundPositionU>
export type ParameterPosition = number | typeof thisArgSymbol | typeof restArgsSymbol

type DropTail<Tuple extends Array<any>> =
	// drop tail including optional items, while labels are kept
	Tuple extends [...infer R extends [any?], ...any]
		? R
		: []
type SliceUntil<Pos extends number, Params extends Array<any>, Prevs extends Array<never> = []> =
	Pos extends Prevs['length']
		? Params
		: Params extends [any?, ...infer Rest]
			? SliceUntil<Pos, Rest, [...Prevs, never]>
			: never
export type SliceParamAt<Pos extends number, Params extends Array<any>> =
	// defer evaluation to avoid TS2589
	SliceUntil<Pos, Params> extends infer Sliced extends Array<any>
		? DropTail<Sliced>
		: never
type _Build<Fn extends AnyFn, MaxStaticArgCount extends number, TakenPositions extends Array<ParameterPosition>, ThisArg> =
	TakenPositions extends [infer Pos extends ParameterPosition, ...infer Rest extends Array<ParameterPosition>]
		? Pos extends typeof thisArgSymbol
			? (thisArg: ThisArg) => _Build<Fn, MaxStaticArgCount, Rest, ThisArg>
			: Pos extends typeof restArgsSymbol
				? (args: SliceUntil<MaxStaticArgCount, Parameters<Fn>>) => _Build<Fn, MaxStaticArgCount, Rest, ThisArg>
				: Pos extends number
					? (..._: SliceParamAt<Pos, Parameters<Fn>>) => _Build<Fn, MaxStaticArgCount, Rest, ThisArg>
					: never
		: ReturnType<Fn>
export type Build<Fn extends AnyFn, MaxStaticArgCount extends number, TakenPositions extends Array<ParameterPosition>, ThisArg> =
	TakenPositions extends []
		? () => ReturnType<Fn>
		:
			Extract< // we do know it definitely is a function, but the compiler does not
				_Build<Fn, MaxStaticArgCount, TakenPositions, ThisArg>,
				AnyFn
			>
