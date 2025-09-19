import { restArgsSymbol, thisArgSymbol } from './symbols.js'
import type { AnyFn, ContainsOptionalParams, ParameterPosition, AvailablePositions, IsGenericFn, Build, SliceParamAt, NonRestParamsOf, ItemOf } from './types.js'

interface Memoized {
	thisArg: any
	args: Array<any>
	restArgs: null | Array<any>
}

export class Context<
	Fn extends AnyFn,
	NonRestParamCount extends number,
	TakenPositions extends Array<ParameterPosition> = [],
	BoundPositionU extends ParameterPosition = never,
	ThisArg = never,
> {
	private readonly fn: Fn
	private readonly nonRestParamCount: number
	private resultParameters: Array<ParameterPosition> = []
	private boundArgs: Array<any> = []
	private boundThis: any = undefined
	private constructor(fn: Fn, nonRestParamCount: number) {
		this.fn = fn
		this.nonRestParamCount = nonRestParamCount
	}
	/**
	 * Creates a `Context` for given function.
	 * 
	 * `nonRestParamCount` is for determining where rest parameter(`...args`) starts.
	 * It can be omitted if the function has no optional parameter, as it can be
	 * detected automatically via [`Function#length`].
	 * 
	 * [`Function#length`]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function/length
	 */
	static new<Fn extends AnyFn, NonRestParamCount extends number = NonRestParamsOf<Fn>['length']>(
		...args:
			ContainsOptionalParams<Fn> extends true
				? [fn: Fn, nonRestParamCount: NoInfer<NonRestParamCount>]
				: [fn: Fn, nonRestParamCount?: NonRestParamCount]
	) {
		const [
			fn,
			nonRestParamCount = fn.length as NonRestParamCount,
		] = args
		return new Context<Fn, NonRestParamCount>(fn, nonRestParamCount)
	}
	#clone(applier?: (ctx: Context<Fn, NonRestParamCount, TakenPositions, BoundPositionU, ThisArg>) => void) {
		const newCtx = new Context<Fn, NonRestParamCount, TakenPositions, BoundPositionU, ThisArg>(this.fn, this.nonRestParamCount)
		newCtx.resultParameters = [...this.resultParameters]
		newCtx.boundArgs = [...this.boundArgs]
		newCtx.boundThis = this.boundThis
		applier?.(newCtx)
		return newCtx
	}
	#takesPosition<P extends ParameterPosition>(pos: P) {
		return this.#clone(it => {
			it.resultParameters.push(pos)
		}) as any as Context<Fn, NonRestParamCount, [...TakenPositions, P], BoundPositionU, ThisArg>
	}
	/**
	 * Specifies the curried function takes parameter at given position.
	 */
	takes<P extends AvailablePositions<Fn, TakenPositions, BoundPositionU>>(position: P) {
		if (position < 0) throw new RangeError(`position must be in range >=0.`)
		if (this.resultParameters.includes(position)) throw new RangeError(`parameter with position ${position} is already registered.`)
		
		return this.#takesPosition(position)
	}
	/**
	 * Specifies the curried function takes `this` parameter.
	 * 
	 * This method cannot be called in case of:
	 * - the method has called multiple times.
	 * - `this` parameter has bound via `withBoundThis`.
	 * 
	 * `TA` specifies the type of `this` parameter.
	 */
	takesThis<TA extends ThisParameterType<Fn>>(
		this: // restrict multiple call
			typeof thisArgSymbol extends ItemOf<TakenPositions> | BoundPositionU
				? never
				: this
	) {
		if (this.resultParameters.includes(thisArgSymbol)) throw new Error('thisArg is already registered.')
		
		return this.#takesPosition(thisArgSymbol) as Context<Fn, NonRestParamCount, [...TakenPositions, typeof thisArgSymbol], BoundPositionU, TA>
	}
	/**
	 * Specifies the curried function takes rest parameter.
	 * This method cannot be called multiple times.
	 */
	takesRest(
		this: // restrict multiple call
			typeof restArgsSymbol extends ItemOf<TakenPositions>
				? never
				: this
	) {
		if (this.resultParameters.includes(restArgsSymbol)) throw new Error('rest parameter is already registered.')
		
		return this.#takesPosition(restArgsSymbol)
	}
	#withBoundPosition<P extends ParameterPosition>(cloneCallback: (ctx: Context<Fn, NonRestParamCount, TakenPositions, BoundPositionU, ThisArg>) => void) {
		return this.#clone(cloneCallback) as any as Context<Fn, NonRestParamCount, TakenPositions, BoundPositionU | P, ThisArg>
	}
	/**
	 * Binds argument for given position.
	 */
	withBound<P extends AvailablePositions<Fn, TakenPositions, BoundPositionU>>(
		position: P,
		arg: SliceParamAt<P, Parameters<Fn>>[0],
	) {
		if (position < 0) throw new RangeError('position must be in range >=0.')
		
		return this.#withBoundPosition<P>(it => {
			it.boundArgs[position] = arg
		})
	}
	/**
	 * Binds `this` argument.
	 * 
	 * This method cannot be called in case of:
	 * - the method has called multiple times.
	 * - it is already specified that the function takes `this` parameter.
	 */
	withBoundThis(
		this:
			typeof thisArgSymbol extends ItemOf<TakenPositions> | BoundPositionU
				? never
				: this,
		thisArg: ThisParameterType<Fn>,
	) {
		return this.#withBoundPosition<typeof thisArgSymbol>(it => {
			it.boundThis = thisArg
		})
	}
	/**
	 * Builds the curried function.
	 * If your function contains type parameters(a.k.a. generics),
	 * you need to specify the signature explicitly.
	 */
	build<
		F = IsGenericFn<Fn> extends true
			? unknown // explicit generic argument is expected
			: Build<Fn, NonRestParamCount, TakenPositions, ThisArg>
	>(): F {
		return (
			this.resultParameters.length < 1
				? () => this.fn.call(undefined) // remove thisArg and ignore arguments
				: this.resultParameters.reduceRight(
						(acc, paramPos) =>
							(memoized: Memoized) =>
								(arg: any) =>
									acc(applyArg(memoized, paramPos, arg)),
						(memoized: Memoized) => {
							const nonRestArgs = Array.from({
								...memoized.args,
								...this.boundArgs,
								length:
									// NOTE: if rest parameter is not taken, we need to consider functions that depends on `arguments.length`
									memoized.restArgs != null
										? this.nonRestParamCount
										: Math.min(Math.max(memoized.args.length, this.boundArgs.length), this.nonRestParamCount),
							})
							return this.fn.call(memoized.thisArg, ...nonRestArgs, ...memoized.restArgs ?? [])
						}
					)({ thisArg: this.boundThis, args: [], restArgs: null })
		) as F
	}
}

const applyArg = (memoized: Memoized, targetPos: ParameterPosition, arg: any) => {
	const copied: Memoized = {
		thisArg: memoized.thisArg,
		args: [...memoized.args],
		restArgs: memoized.restArgs,
	}
	
	if (targetPos === thisArgSymbol) copied.thisArg = arg
	else if (targetPos === restArgsSymbol) copied.restArgs = arg
	else copied.args[targetPos] = arg
	
	return copied
}
