# create-curried
> :information_source: The package is ESM-only.

A utility to create curried functions that its parameters are reordered by user-defined order.

# Installation
```sh
npm install create-curried
```

# Quick Example (TypeScript)
```ts
import { curried } from 'create-curried'

const toBinaryString = curried(Number.prototype.toString, 1)
	.withBound(0, 2)
	.takesThis<number>() // no explicit `this` parameter in the signature, so manually specify it is a `number`
	.build()

toBinaryString(10) // => '1010'

const map = curried(Array.prototype.map, 2)
	.takes(0)
	.takesThis()
	.build<
		<T, U>(callbackfn: (value: T, index: number, array: Array<T>) => U) =>
			(array: Array<T>) =>
				Array<U>
	>()

const plusOne = (x: number) => x + 1
const plusOneEach = map(plusOne)

plusOneEach([1, 2, 3]) // => [2, 3, 4]
```

# Guide
Start by calling `curried` on the function: `curried(f)`.
If your function contains an optional parameter, you need to specify
number of its parameter to determine where non-rest parameter ends.

Then, call method `takes`/`takesThis`/`takesRest` to specify
what the curried function takes (order matters!).
If some parameter of your function needs to be bound, you are allowed to call method `withBound`/`withBoundThis`.

Now, call method `build` to build curried function.
If your function contains type parameters (a.k.a. generics),
you need to specify signature of the curried function, to
make the function to have a correct signature.

# Note
- your curried function takes rest parameter as single argument(`args: Array<T>`),
  not multiple arguments(`...args: Array<T>`).
- parameters that are not specified to take, get filled with `undefined`.
