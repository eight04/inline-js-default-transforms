/* eslint-env mocha */
const assert = require("assert");
const dataurl = require("dataurl");
const {withDir} = require("tempdir-yaml");
const {default: endent} = require("endent");

const {createInliner} = require("inline-js-core");

const inliner = createInliner();
inliner.useConfig({
  resources: require("inline-js-default-resources").RESOURCES,
  transforms: require("..").TRANSFORMS
});

it("cssmin", () =>
  withDir(`
    - entry.txt: |-
        $inline("foo.css|cssmin")
    - foo.css: |
        body {
          color: #000000;
        }
  `, async resolve => {
    const {content} = await inliner.inline({
      target: {
        name: "file",
        args: [resolve("entry.txt")]
      }
    });
    
    assert.equal(content, "body{color:#000}");
  })
);

it("docstring", () =>
  withDir(`
    - entry.txt: |-
        $inline("foo.js|docstring")
    - foo.js: |
        require("neodoc").run(\`
        some text
        \\\\\`escape chars\\\\\`
        \`)
  `, async resolve => {
    const fs = require("fs");
    console.log(fs.readFileSync(resolve("foo.js"), "utf8"));
    const {content} = await inliner.inline({
      target: {
        name: "file",
        args: [resolve("entry.txt")]
      }
    });
    
    assert.equal(content, "\nsome text\n`escape chars`\n");
  })
);

it("eval", () =>
  withDir(`
    - entry.txt: |-
        $inline("foo.txt|eval:Number($0)+321")
    - foo.txt: |
        123
  `, async resolve => {
    const {content} = await inliner.inline({
      target: {
        name: "file",
        args: [resolve("entry.txt")]
      }
    });
    
    assert.equal(content, "444");
  })
);

describe("indent", () => {
  it("no effect without whitespace", () =>
    withDir(`
      - entry.txt: |-
          foo {
          $inline("foo.txt|indent")
          }
      - foo.txt: |-
          bar
          baz
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      
      assert.equal(content, endent`
        foo {
        bar
        baz
        }
      `);
    })
  );
  
  it("works with $inline", () =>
    withDir(`
      - entry.txt: |-
          foo {
            $inline("foo.txt|indent")
          }
      - foo.txt: |-
          bar
          baz
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      
      assert.equal(content, endent`
        foo {
          bar
          baz
        }
      `);
    })
  );
  
  it("works with $inline.start", () =>
    withDir(`
      - entry.txt: |-
          foo {
            // $inline.start("foo.txt|indent");
            ...
            // $inline.end
          }
      - foo.txt: |-
          bar
          baz
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      
      assert.equal(content, endent`
        foo {
          // $inline.start("foo.txt|indent");
          bar
          baz
          // $inline.end
        }
      `);
    })
  );
});

it("parse", () =>
  withDir(`
    - entry.txt: |-
        $inline("foo.txt|parse:version")
        $inline("foo.txt|parse:nested,prop")
    - foo.txt: |-
        {
          "version": 1,
          "nested": {
            "prop": 2
          }
        }
  `, async resolve => {
    const {content} = await inliner.inline({
      target: {
        name: "file",
        args: [resolve("entry.txt")]
      }
    });
    
    assert.equal(content, endent`
      1
      2
    `);
  })
);

describe("string", () => {
  it("buffer to string", () =>
    withDir(`
      - entry.txt: |-
          $inline("raw:foo.txt|string")
      - foo.txt: |-
          我
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, "我");
    })
  );
  
  it("buffer to binary string", () =>
    withDir(`
      - entry.txt: |-
          $inline("raw:foo.txt|string:binary")
      - foo.txt: |-
          我
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, 'æ');
    })
  );
  
  it("string to string (no effect)", () =>
    withDir(`
      - entry.txt: |-
          $inline("text:foo.txt|string")
      - foo.txt: |-
          我
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, '我');
    })
  );
});

it("stringify", () =>
  withDir(`
    - entry.txt: |-
        $inline("foo.txt|stringify")
    - foo.txt: |-
        test
  `, async resolve => {
    const {content} = await inliner.inline({
      target: {
        name: "file",
        args: [resolve("entry.txt")]
      }
    });
    assert.equal(content, '"test"');
  })
);

it("trim", () =>
  withDir(`
    - entry.txt: |-
        $inline("foo.txt")
    - entry2.txt: |-
        $inline("foo.txt|trim")
    - foo.txt: |
    
    
        test
        
        
        
  `, async resolve => {
    const {content: rawContent} = await inliner.inline({
      target: {
        name: "file",
        args: [resolve("entry.txt")]
      }
    });
    const {content: trimmedContent} = await inliner.inline({
      target: {
        name: "file",
        args: [resolve("entry2.txt")]
      }
    });
    assert.notEqual(rawContent, trimmedContent);
    assert.equal(rawContent.trim(), trimmedContent);
  })
);

describe("markdown", () => {
  it("codeblock", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo.txt|markdown:codeblock")
      - foo.txt: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, endent`
        \`\`\`
        foo
        \`\`\`
      `);
    })
  );
  
  it("codeblock with lang", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo.txt|markdown:codeblock,js")
      - foo.txt: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, endent`
        \`\`\`js
        foo
        \`\`\`
      `);
    })
  );
  
  it("code", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo.txt|markdown:code")
      - foo.txt: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, "`foo`");
    })
  );
  
  it("quote", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo.txt|markdown:quote")
      - foo.txt: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, "> foo");
    })
  );
  
  it("multiline quote", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo.txt|markdown:quote")
      - foo.txt: |-
          foo
          bar
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, endent`
        > foo
        > bar
      `);
    })
  );
});
  
describe("dataurl", () => {
  it("unknown file, default to text file", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo|dataurl")
      - foo: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, dataurl.format({data: Buffer.from("foo"), mimetype: "text/plain", charset: "utf8"}));
    })
  );
  
  it("big5 encoded binary", () =>
    withDir(`
      - entry.txt: |-
          $inline("raw:foo|dataurl:text/plain,big5")
      - foo: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, dataurl.format({data: Buffer.from("foo"), mimetype: "text/plain", charset: "big5"}));
    })
  );
  
  it("text file", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo.css|dataurl:")
      - foo.css: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, dataurl.format({data: "foo", mimetype: "text/css", charset: "utf8"}));
    })
  );
  
  it("binary file", () =>
    withDir(`
      - entry.txt: |-
          $inline("foo.png|dataurl:")
      - foo.png: |-
          foo
    `, async resolve => {
      const {content} = await inliner.inline({
        target: {
          name: "file",
          args: [resolve("entry.txt")]
        }
      });
      assert.equal(content, dataurl.format({data: Buffer.from("foo"), mimetype: "image/png"}));
    })
  );
});
