import { Context } from './Context'
import type { AnyFn } from './types'

export const curried = <Fn extends AnyFn>(fn: Fn, maxStaticArgCount?: number) =>
	new Context(fn, maxStaticArgCount)
