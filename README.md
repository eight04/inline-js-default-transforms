inline-js-default-transforms
============================

[![Build Status](https://travis-ci.org/eight04/inline-js-default-transforms.svg?branch=master)](https://travis-ci.org/eight04/inline-js-default-transforms)
[![codecov](https://codecov.io/gh/eight04/inline-js-default-transforms/branch/master/graph/badge.svg)](https://codecov.io/gh/eight04/inline-js-default-transforms)
[![install size](https://packagephobia.now.sh/badge?p=inline-js-default-transforms)](https://packagephobia.now.sh/result?p=inline-js-default-transforms)

This repository contains builtin transformers for [inline-js](https://github.com/eight04/inline-js)

Installation
------------
```js
npm install inline-js-default-transforms
```

Usage
-----
```js
const {createInliner} = require("inline-js-core");
const {TRANSFORMS} = require("inline-js-default-transforms");

const inliner = createInliner();
TRANSFORMS.forEach(inliner.transformer.add);
```

TRANSFORMS
----------

### cssmin
Minify css content.

### dataurl
Convert the content into data URL.

The transformer would determine the mimetype from the filename:
```js
// data:text/css;charset=utf8;base64,...
$inline("mystyle.css|dataurl")

// data:image/png;base64,...
$inline("myimage.png|dataurl")
```
Or you can pass the mimetype manually:
```js
$inline("somefile.txt|dataurl:text/css")
```
Specify charset (default to `utf8` for text files):
```js
$inline("somefile.txt|dataurl:text/css,utf8")
```

### docstring
Extract docstring (i.e. the top-most template literal) from the content.

### eval
Evaluate JavaScript expression. You can access the content with `$0`.
```js
var version = $inline("./package.json|eval:JSON.parse($0).version|stringify");
```

### indent
Indent the string according to the indent of the current line.

*entry.js*
```js
function test() {
  $inline("foo.js|indent");
}
```
*foo.js*
```js
console.log("foo");
console.log("bar");
```
`inlinejs entry.js` result:
```js
function test() {
  console.log("foo");
  console.log("bar");
}
```

### markdown
Wrap content with markdown codeblock, code, or quote.
````js
// a.txt
some text

// $inline("a.txt|markdown:codeblock")
```
some text
```

// $inline("a.txt|markdown:codeblock,js")
```js
some text
```

// $inline("a.txt|markdown:code")
`some text`

// $inline("a.txt|markdown:quote")
> sometext
````

### parse
`JSON.parse` the content. You can access properties by specifying key name.
```js
var version = $inline("./package.json|parse:version"),
  nestedProp = $inline("./package.json|parse:nested,prop");
```

### string

If the content is a buffer, convert it into a utf8 string. Otherwise do nothing.

### stringify
`JSON.stringify` the content. Useful to include text content into JavaScript code:
```js
var myCssString = $inline("./style.css|cssmin|stringify");
```

### trim
`String.prototype.trim` the content.

Changelog
---------

* 0.1.1 (Jun 28, 2018)

  - Fix: exclude test files from the package.

* 0.1.0 (Jun 27, 2018)

  - Split out from inline-js.
