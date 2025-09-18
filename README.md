# create-curried
An utility to create curried functions that its parameters are reordered by user-defined order

# Installation
```sh
npm install create-curried
```

# Usage

## `curried(fn, maxStaticArgCount?)`
Returns a `Context` for given function. \
`maxStaticArgCount` is maximum number of arguments given function takes, and will be used to determine where non-rest parameters end.
This includes optional parameters as well, but not rest parameters because they have no static argument count.

## `Context`
Contains informations about given function such as how parameters should be ordered. \
Generated function's parameters' order depends on order of method calls. \
For example, on below, `reversedF` is `b => a => [a, b]`, and `justF` is `a => b => [a, b]`.
```js
const f = (a, b) => [a, b]

const reversedF = curried(f)
	.takes(1)
	.takes(0)
	.generate()

const justF = curried(f)
	.takes(0)
	.takes(1)
	.generate()
```

Parameters that are not taken from given function will be filled with `undefined`.

### `Context#takes(position)`
Takes a parameter of the function with given position.

### `Context#takesThis()`
Takes thisArg of the function.

### `Context#takesRest()`
Takes rest parameter of the function.
because of curried function must take single argument, generated function will take an array instead of taking arguments directly.

<br />

> Bound values can be overwritten by generated function's parameters.
### `Context#withStatic(position)`
> :warning: This method is a [HOF(Higher-Order Function)](https://wikipedia.org/wiki/Higher-order_function).

Binds argument for given position.
Returns a function that can set argument.

#### To TypeScript Users
Returned function takes single generic parameter that can coerce type of `value`.

### `Context#withStaticThis(thisArg)`
Binds thisArg.

#### To JavaScript Users
The method is a HOF due to support TypeScript well.

#### To TypeScript Users
The method takes single generic parameter that can coerce type of `thisArg`.

### `Context#generate()`
Generates curried function that its parameters are ordered by order of method calls.

#### To TypeScript Users
The method takes single generic parameter `ResultFn` that will be used to do forced type cast for generated function, due to there is no way to handle generic parameters of a function in type level.
`ResultFn` is type of given function by default.

## JavaScript
```js
const { curried } = require('create-curried')

const map = curried(Array.prototype.map)
	.takes(0)
	.takesThis()
	.generate()

const plusOne = x => x + 1
const plusOneEach = map(plusOne)

plusOneEach([1, 2, 3]) // => [2, 3, 4]

const toBinaryString = curried(Number.prototype.toString)
	.withStatic(0)(2)
	.takesThis()
	.generate()

toBinaryString(10) // => '1010'
```

## TypeScript
```ts
import { curried } from 'create-curried'

const map = curried(Array.prototype.map)
	.takes(0)
	.takesThis()
	.generate<
		<T, U>(callbackfn: (value: T, index: number, array: Array<T>) => U) =>
			(array: Array<T>) =>
				Array<U>
	>()

const plusOne = (x: number) => x + 1
const plusOneEach = map(plusOne)

plusOneEach([1, 2, 3]) // => [2, 3, 4]

const toBinaryString = curried(Number.prototype.toString)
	.withStatic(0)<number>(2)
	.takesThis()
	.generate<(number: number) => string>()

toBinaryString(10) // => '1010'
```
