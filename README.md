# greply

Small Node.js wrapper around the `greply` CLI for programmatic use (e.g. MCP servers).


## Install CLI
#### Install latest from main branch
wget
```bash
wget -O - https://raw.githubusercontent.com/AnthonyRuffino/greply/main/install.sh | bash
```

curl
```bash
curl -sSL https://raw.githubusercontent.com/AnthonyRuffino/greply/main/install.sh | bash
```

## Install

```bash
npm i greply
# or
pnpm add greply
```

> Requires Node 18+. By default the wrapper prefers its bundled `greply.sh` (shipped in this package). If not present, it falls back to `greply` on PATH. You can override with `greply_CMD=/path/to/greply` or the `greplyCmd` option.

## Usage

```js
import { greplyRun, greplyHelp } from "greply";

const { stdout } = await greplyRun({
  query: "TODO",
  target: ".",
  before: 1,
  after: 1,
  recursive: true,
  fixedStrings: true
});
console.log(stdout);

// Usage text
const help = await greplyHelp();
console.log(help.stdout || help.stderr);
```

### Quick local test against the bundled README


#### Relative Path Handling:
Uses relative path 'node_modules/greply/README.md' directly.

##### Command:
```sh
node -e '
  import("greply")
    .then(m => 
      m.greplyRun({ query: "m.greplyRun", target: "README.md", fixedStrings: true })
        .then(r => console.log(r.stdout))
    )
'
```
##### Output:
```
README.md:46:      m.greplyRun({ query: "greplyRun", target: "README.md", fixedStrings: true })
README.md:53:...
```

#### Absolute Path Handling:
Uses path.resolve(process.cwd(), 'node_modules/greply/README.md') to create an absolute path

##### Command:
```sh
node -e '
  import("greply")
    .then(g => 
      import("node:path")
        .then(p => p.resolve(process.cwd(), "README.md"))
        .then(f => 
          g.greplyRun({ query: "g.greplyRun", target: f, fixedStrings: true })
        )
        .then(r => console.log(r.stdout))
    )
'
```

##### Output:
```
README.md:68:          g.greplyRun({ query: "PATH", target: f, fixedStrings: true })
README.md:77:...
```

### Environment setup from source

```sh
rm -rf /tmp/greply-test && mkdir -p /tmp/greply-test && cd /tmp/greply-test
git clone git@github.com:AnthonyRuffino/greply.git
cd greply
npm pack
cd ..
cp greply/greply-{release}.tgz .
npm i greply-{release}.tgz
```


### Installing the cli (optional)

- Install using the bundled script from `node_modules` (no network). The programmatic `install()` copies the included `greply.sh` to a destination and marks it executable. By default, it writes to `~/.local/bin/greply` and prompts before overwrite.

If you do not want to install greply directly, you can use the bash script bundled with the npm packacge with the following usage:

```sh
/node_modules/greply/greply.sh -c PATH  node_modules/greply/README.md
```

To install as executable bash script `~/.local/bin/greply`
```sh
node -e "import('greply').then(m => m.install())"
```

When you need control:
```sh
node -e "(async()=>{ const m=await import('greply'); await m.install(); })()"
```


#### Quick Install Script

Download and run the install script in one command:

#### Install Script Parameters:
- **First parameter**: `wget` (direct download) or `npm` (clone + build)
- **Second parameter**: version tag (optional, e.g., "0.1.0", "1.0.0")
- **Defaults**: `wget` method, latest from main branch if no version specified

#### Install latest from main branch
```bash
wget -O - https://raw.githubusercontent.com/AnthonyRuffino/greply/main/install.sh | bash
```

#### Install specific version
```bash
wget -O - https://raw.githubusercontent.com/AnthonyRuffino/greply/main/install.sh | bash -s wget 0.1.4
```

#### Install via npm method with version
```bash
wget -O - https://raw.githubusercontent.com/AnthonyRuffino/greply/main/install.sh | bash -s npm 0.1.4
```

### Options → greply flags
Usage: ./node_modules/greply/greply.sh [options] <search_string> <file_or_directory>
- before → -B
- after → -A
- recursive → -R
- wholeWord → -w
- matchCase → -c
- fixedStrings → -F
- greplyCmd → custom path/command for greply
- suppressErrors → return stdout/stderr even if exit code ≠ 0

Usage once installed: greply [options] <search_string> <file_or_directory>
e.g.
```sh
greply -c PATH  node_modules/greply/README.md
```

