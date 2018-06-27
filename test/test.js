/* eslint-env mocha */
const assert = require("assert");
const dataurl = require("dataurl");
const {createTransformer} = require("inline-js-core/lib/transformer");
const {TRANSFORMS} = require("..");

describe("transforms", () => {
  const transformer = createTransformer();
  TRANSFORMS.forEach(transformer.add);
	
  function prepare(baseOptions) {
    return options => {
      const {
        name,
        content,
        args = [],
        expect,
        source,
        error,
        ctx = {inlineTarget: source}
      } = Object.assign({}, baseOptions, options);
      return transformer.transform(ctx, content, [{name, args}])
        .then(
          result => assert.equal(result, expect),
          err => {
            if (!error) {
              throw err;
            }
          }
        );
    };
  }
	
	it("cssmin", () => {
    const test = prepare({
      name: "cssmin",
      content: 'body {\n  color: #000000;\n}\n',
      expect: "body{color:#000}"
    });
    return test();
	});
  
  it("docstring", () => {
    const test = prepare({
      name: "docstring",
      content: "`test escaped?\\`\"\\\" new line? \\n\r\n`",
      expect: "test escaped?`\"\" new line? \n\n"
    });
    return test();
  });
	
	it("eval", () => {
    const test = prepare({
      name: "eval",
      content: "123",
      args: ["Number($0) + 321"],
      expect: 444
    });
    return test();
  });
  
  describe("indent", () => {
    const ctx = {
      sourceContent: "  $inline('foo|indent')",
      inlineDirective: {
        start: 2,
        end: 23
      }
    };
    const test = prepare({
      name: "indent",
      content: "foo\nbar",
      ctx,
      expect: "foo\n  bar"
    });
    
    it("basic", () => test());
    
    it("no indent", () => test({
      ctx: Object.assign({}, ctx, {sourceContent: "__$inline('foo|indent')"}),
      expect: "foo\nbar"
    }));
  });
	
	it("parse", () => {
    const test = prepare({
      name: "parse",
      content: '{"version": "1.2.3","nested": {"prop": 123}}'
    });
    return Promise.all([
      test({args: ["version"], expect: "1.2.3"}),
      test({args: ["nested", "prop"], expect: 123})
    ]);
	});
  
  it("string", () => {
    const test = prepare({
      name: "string",
      content: Buffer.from("我")
    });
    return Promise.all([
      test({expect: "我"}),
      test({args: ["binary"], expect: 'æ'}),
      test({content: "test", expect: "test"})
    ]);
  });
  
  it("stringify", () => {
    const test = prepare({
      name: "stringify",
      content: "some text",
      expect: '"some text"'
    });
    return test();
  });
  
  it("trim", () => {
    const test = prepare({
      name: "trim",
      content: " foo  ",
      expect: "foo"
    });
    return test();
  });
	
	it("markdown", () => {
    const test = prepare({
      name: "markdown",
      content: "some text"
    });
    return Promise.all([
      test({args: ["codeblock"], expect: "```\nsome text\n```"}),
      test({args: ["code"], expect: "`some text`"}),
      test({args: ["quote"], expect: "> some text"}),
      test({
        args: ["quote"],
        content: "some text\nsome text",
        expect: "> some text\n> some text"
      }),
      test({args: ["unknown"], error: true})
    ]);
	});
	
	describe("dataurl", () => {
    const test = prepare({name: "dataurl"});
    
    it("unknown file, default to text file", () =>
      test({
        source: {name: "file", args: ["test"]},
        content: Buffer.from("foo"),
        expect: dataurl.format({data: Buffer.from("foo"), mimetype: "text/plain", charset: "utf8"})
      })
    );
    
    it("big5 encoded binary", () =>
      test({
        source: {name: "raw", args: ["test"]},
        args: ["text/plain", "big5"],
        content: Buffer.from("foo"),
        expect: dataurl.format({data: Buffer.from("foo"), mimetype: "text/plain", charset: "big5"})
      })
    );
    
    it("text file", () =>
      test({
        source: {name: "file", args: ["test.css"]},
        content: "foo",
        expect: dataurl.format({data: "foo", mimetype: "text/css", charset: "utf8"})
      })
    );
    
    it("binary file", () =>
      test({
        source: {name: "file", args: ["test.png"]},
        content: Buffer.from("foo"),
        expect: dataurl.format({data: Buffer.from("foo"), mimetype: "image/png"})
      })
    );
	});
  
  it("handle promise", () => {
    transformer.add({
      name: "testPromise",
      transform() {
        return new Promise(resolve => {
          setTimeout(() => resolve("OK"), 10);
        });
      }
    });
    
    const test = prepare({name: "testPromise", expect: "OK"});
    return test();
  });
});
