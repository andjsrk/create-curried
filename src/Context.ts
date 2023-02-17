import { restArgs, thisArg } from './symbols'
import type { AnyFn, ParameterPosition, TakeCount } from './types'

interface Memoized {
	thisArg?: any
	args: Array<any>
	restArgs?: Array<any>
}

export class Context<Fn extends AnyFn, TakenPositions extends ParameterPosition = never> {
	private resultParameters: Array<ParameterPosition> = []
	private boundArgs: Array<any> = []
	private boundThis: any
	constructor(
		private readonly fn: Fn,
		private readonly maxStaticArgCount: number = fn.length,
	) {}
	#clone(applier?: (ctx: Context<Fn, TakenPositions>) => void) {
		const newCtx = new Context<Fn, TakenPositions>(this.fn, this.maxStaticArgCount)
		newCtx.resultParameters = [...this.resultParameters]
		newCtx.boundArgs = [...this.boundArgs]
		newCtx.boundThis = this.boundThis
		applier?.(newCtx)
		return newCtx
	}
	takes<P extends Exclude<TakeCount<Fn>, TakenPositions>>(position: P) {
		if (position < 0) throw new RangeError(`position must be in range >=0.`)
		if (this.resultParameters.includes(position)) throw new RangeError(`parameter with position ${position} is already registered`)
		
		return this.#clone(it => {
			it.resultParameters.push(position)
		}) as any as Context<Fn, TakenPositions | P>
	}
	takesThis(
		this: // restricts multiple call
			typeof thisArg extends TakenPositions
				? never
				: Context<Fn, TakenPositions>
	) {
		if (this.resultParameters.includes(thisArg)) throw new Error(`thisArg is already registered`)
		
		return this.#clone(it => {
			it.resultParameters.push(thisArg)
		}) as any as Context<Fn, TakenPositions | typeof thisArg>
	}
	takesRest(
		this: // restricts multiple call
			typeof restArgs extends TakenPositions
				? never
				: Context<Fn, TakenPositions>
	) {
		if (this.resultParameters.includes(restArgs)) throw new Error('rest parameter is already registered')
		
		return this.#clone(it => {
			it.resultParameters.push(restArgs)
		}) as any as Context<Fn, TakenPositions | typeof restArgs>
	}
	withStatic<P extends Exclude<TakeCount<Fn>, TakenPositions>>(position: P) {
		if (position < 0) throw new RangeError(`position must be in range >=0.`)
		
		return <T>(arg: T) =>
			this.#clone(it => {
				it.boundArgs[position] = arg
			})
	}
	withStaticThis<T>(thisArg: T) {
		return this.#clone(it => {
			it.boundThis = thisArg
		})
	}
	generate<ResultFn extends AnyFn = Fn>() {
		return (
			this.resultParameters.length < 1
				? () => this.fn.call(undefined) // remove thisArg and ignore arguments
				: this.resultParameters.reduceRight(
						(acc, param) =>
							(memoized: Memoized) =>
								(arg: any) =>
									acc(applyArg(memoized, param, arg)),
						(memoized: Memoized) => {
							const args = Array.from({
								...this.boundArgs,
								...memoized.args,
								length: this.maxStaticArgCount,
							})
							return this.fn.call(memoized.thisArg, ...args, ...memoized.restArgs ?? [])
						}
					)({ thisArg: this.boundThis, args: [] })
		) as any as ResultFn
	}
}

const applyArg = (memoized: Memoized, target: ParameterPosition, arg: any) => {
	const copied = { ...memoized }
	
	if (target === thisArg) copied.thisArg = arg
	else if (target === restArgs) copied.restArgs = arg
	else copied.args[target] = arg
	
	return copied
}
