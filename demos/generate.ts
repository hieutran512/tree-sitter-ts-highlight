import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getThemeNames } from "../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demoBundlePath = join(__dirname, "..", "dist", "demo.iife.js");
const demoBundle = readFileSync(demoBundlePath, "utf-8").replaceAll("</script>", "<\\/script>");

const languageSamples: Record<string, { label: string; code: string }> = {
  typescript: {
    label: "TypeScript",
    code: `import { readFile } from "node:fs/promises";

interface Config {
  port: number;
  host: string;
  debug?: boolean;
}

export class Server {
  constructor(private config: Config) {}

  start(): void {
    const { host, port } = this.config;
    console.log("Server running at " + host + ":" + port);
  }
}

export function createServer(port = 3000): Server {
  return new Server({ port, host: "localhost", debug: true });
}`,
  },
  javascript: {
    label: "JavaScript",
    code: `const users = [
  { name: "Ada", age: 31 },
  { name: "Lin", age: 17 },
];

function getAdults(list) {
  return list.filter((item) => item.age >= 18).map((item) => item.name);
}

console.log(getAdults(users));`,
  },
  python: {
    label: "Python",
    code: `from dataclasses import dataclass

@dataclass
class User:
    name: str
    active: bool = True


def greet(user: User) -> str:
    if user.active:
        return f"Hello, {user.name}!"
    return "Inactive user"`,
  },
  go: {
    label: "Go",
    code: `package main

import "fmt"

type User struct {
    Name string
    Age  int
}

func main() {
    user := User{Name: "Go", Age: 16}
    fmt.Println(user)
}`,
  },
  rust: {
    label: "Rust",
    code: `struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User { name: String::from("Rust"), age: 8 };
    println!("{} {}", user.name, user.age);
}`,
  },
  java: {
    label: "Java",
    code: `public class Main {
  static class User {
    String name;
    int age;

    User(String name, int age) {
      this.name = name;
      this.age = age;
    }
  }

  public static void main(String[] args) {
    User user = new User("Java", 30);
    System.out.println(user.name + " " + user.age);
  }
}`,
  },
  csharp: {
    label: "C#",
    code: `using System;

record User(string Name, int Age);

var user = new User("CSharp", 20);
Console.WriteLine($"{user.Name} {user.Age}");`,
  },
  cpp: {
    label: "C++",
    code: `#include <iostream>

class User {
public:
  std::string name;
  int age;

  User(std::string n, int a) : name(n), age(a) {}
};

int main() {
  User user("CPP", 40);
  std::cout << user.name << " " << user.age << std::endl;
}`,
  },
  ruby: {
    label: "Ruby",
    code: `class User
  attr_reader :name, :age

  def initialize(name, age)
    @name = name
    @age = age
  end
end

user = User.new("Ruby", 28)
puts "#{user.name} #{user.age}"`,
  },
  php: {
    label: "PHP",
    code: `<?php
class User {
  public function __construct(
    public string $name,
    public int $age
  ) {}
}

$user = new User("PHP", 23);
echo $user->name . " " . $user->age;`,
  },
  kotlin: {
    label: "Kotlin",
    code: `data class User(val name: String, val age: Int)

fun main() {
    val user = User("Kotlin", 12)
    println("\${user.name} \${user.age}")
}`,
  },
  swift: {
    label: "Swift",
    code: `struct User {
    let name: String
    let age: Int
}

let user = User(name: "Swift", age: 11)
print("\(user.name) \(user.age)")`,
  },
  css: {
    label: "CSS",
    code: `:root {
  --accent: #7aa2f7;
}

.card {
  color: var(--accent);
  border: 1px solid #2a2a3a;
}`,
  },
  html: {
    label: "HTML",
    code: `<section class="card">
  <h1>Demo</h1>
  <p data-id="42">Hello</p>
</section>`,
  },
  json: {
    label: "JSON",
    code: `{
  "name": "json-demo",
  "enabled": true,
  "ports": [3000, 3001],
  "meta": { "owner": "team" }
}`,
  },
  yaml: {
    label: "YAML",
    code: `name: yaml-demo
enabled: true
ports:
  - 3000
  - 3001
meta:
  owner: team`,
  },
  sql: {
    label: "SQL",
    code: `SELECT id, name
FROM users
WHERE active = true
ORDER BY created_at DESC
LIMIT 10;`,
  },
  shell: {
    label: "Shell",
    code: `#!/usr/bin/env bash
set -euo pipefail

name="demo"
echo "running $name"`,
  },
  markdown: {
    label: "Markdown",
    code: `# Demo

- **Bold** item
- Inline code: \`npm run build\`

> Quote`,
  },
  xml: {
    label: "XML",
    code: `<users>
  <user id="1" active="true">Alice</user>
  <user id="2" active="false">Bob</user>
</users>`,
  },
  toml: {
    label: "TOML",
    code: `# TOML demo config
title = "tree-sitter-ts-highlight"
enabled = true
timeout = 30
pi = 3.14159
hosts = ["alpha", "beta"]

[database]
server = "192.168.1.1"
ports = [8001, 8001, 8002]
connection_max = 5000

[owner]
name = "Tom Preston-Werner"
dob = 1979-05-27T07:32:00Z`,
  },
};

const themeNames = getThemeNames();

const dslCode = `# Pipeline DSL sample
pipeline deploy {
  stage build {
    step compile
    step test
  }

  stage release {
    when env.TARGET = "prod"
    step publish
  }
}`;

const dslProfile = {
  name: "pipeline-dsl",
  displayName: "Pipeline DSL",
  version: "1.0.0",
  fileExtensions: [".pipe"],
  lexer: {
    charClasses: {
      identStart: { union: [{ predefined: "letter" }, { chars: "_" }] },
      identPart: { union: [{ predefined: "alphanumeric" }, { chars: "_-" }] },
    },
    tokenTypes: {
      keyword: { category: "keyword" },
      identifier: { category: "identifier" },
      string: { category: "string" },
      number: { category: "number" },
      comment: { category: "comment" },
      operator: { category: "operator" },
      punctuation: { category: "punctuation" },
      type: { category: "type" },
      whitespace: { category: "whitespace" },
      newline: { category: "newline" },
    },
    initialState: "default",
    skipTokens: ["whitespace", "newline"],
    states: {
      default: {
        rules: [
          { match: { kind: "keywords", words: ["pipeline", "stage", "step", "when", "env"] }, token: "keyword" },
          { match: { kind: "keywords", words: ["String", "Number", "Boolean", "File"] }, token: "type" },
          { match: { kind: "line", start: "#" }, token: "comment" },
          { match: { kind: "delimited", open: '"', close: '"', escape: "\\" }, token: "string" },
          { match: { kind: "number", integer: true, float: true }, token: "number" },
          { match: { kind: "string", value: ["->", "=>", "|", "="] }, token: "operator" },
          { match: { kind: "string", value: ["{", "}", "(", ")", "[", "]", ",", ":", ";", "."] }, token: "punctuation" },
          { match: { kind: "charSequence", first: { ref: "identStart" }, rest: { ref: "identPart" } }, token: "identifier" },
          { match: { kind: "charSequence", first: { predefined: "whitespace" }, rest: { predefined: "whitespace" } }, token: "whitespace" },
          { match: { kind: "string", value: "\n" }, token: "newline" },
        ],
      },
    },
  },
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>tree-sitter-ts-highlight — Interactive Demo</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0 20px 80px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f14;
      color: #e6e6e6;
      line-height: 1.5;
    }
    .container { max-width: 1080px; margin: 0 auto; }
    h1 { margin: 40px 0 8px; font-size: 2rem; }
    .subtitle { color: #9aa0aa; margin-bottom: 28px; }
    .panel {
      border: 1px solid #25253a;
      border-radius: 10px;
      background: #141422;
      padding: 16px;
      margin-bottom: 16px;
    }
    .controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      align-items: end;
    }
    label { font-size: 0.82rem; color: #9aa0aa; display: block; margin-bottom: 6px; }
    select, textarea, button, input[type="checkbox"] {
      font: inherit;
    }
    select, textarea {
      width: 100%;
      background: #0f1020;
      border: 1px solid #2a2a3a;
      color: #e6e6e6;
      border-radius: 8px;
      padding: 10px;
    }
    textarea { min-height: 200px; resize: vertical; font-family: 'SF Mono', Menlo, monospace; font-size: 13px; }
    button {
      background: #7aa2f7;
      border: none;
      color: #101420;
      border-radius: 8px;
      padding: 10px 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .row { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
    .check { display: flex; align-items: center; gap: 8px; color: #c8c8d4; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 860px) { .grid-2 { grid-template-columns: 1fr; } }
    .code-wrap pre {
      margin: 0;
      border-radius: 8px;
      overflow-x: auto;
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
      font-family: 'SF Mono', Menlo, monospace;
    }
    h2 { margin: 0 0 10px; font-size: 1.15rem; }
    .muted { color: #9aa0aa; font-size: 0.92rem; }
    ul { margin: 8px 0 0 18px; }
    .symbols-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .symbols-table th, .symbols-table td {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid #2a2a3a;
      font-family: 'SF Mono', Menlo, monospace;
      font-size: 12px;
    }
    .symbols-table th { color: #7aa2f7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .small { font-size: 0.8rem; color: #7f8694; }
  </style>
  <script>
window.__TS_DEMO_BUNDLE_OK__ = false;
window.__TS_DEMO_BUNDLE_ERROR__ = null;
try {
${demoBundle}
window.__TS_DEMO_BUNDLE_OK__ = true;
} catch (error) {
window.__TS_DEMO_BUNDLE_ERROR__ = String(error && error.stack ? error.stack : error);
}
  </script>
</head>
<body>
  <div class="container">
    <h1>tree-sitter-ts-highlight</h1>
    <p class="subtitle">Interactive playground: select language/theme, toggle semantic highlighting, or paste your own code.</p>

    <div class="panel">
      <div class="controls">
        <div>
          <label for="language">Language</label>
          <select id="language"></select>
        </div>
        <div>
          <label for="theme">Theme</label>
          <select id="theme"></select>
        </div>
        <div>
          <label>&nbsp;</label>
          <button id="renderBtn" type="button">Render</button>
        </div>
      </div>
      <div class="row" style="margin-top:12px">
        <label class="check"><input id="semantic" type="checkbox" checked /> Semantic highlighting</label>
        <label class="check"><input id="lineNumbers" type="checkbox" checked /> Line numbers</label>
        <label class="check"><input id="customInput" type="checkbox" /> Use custom input</label>
        <button id="dslBtn" type="button">Register custom DSL profile</button>
      </div>
      <p class="small" style="margin-top:10px">Tip: run <strong>npm run build</strong> then <strong>npm run demo:generate</strong> to refresh this self-contained offline demo.</p>
    </div>

    <div class="panel">
      <label for="source">Source code</label>
      <textarea id="source"></textarea>
    </div>

    <div class="panel code-wrap">
      <h2>Selected Output</h2>
      <div id="preview"></div>
    </div>

    <div class="panel">
      <h2>Why use this library?</h2>
      <p class="muted">Compared with regex-based highlighters, this demo shows tree-sitter-ts benefits in practice:</p>
      <ul>
        <li>Semantic reclassification (same token stream, richer visual contrast for properties/types/variables).</li>
        <li>Language profile extension at runtime (register custom DSL without plugin recompilation).</li>
        <li>Code structure extraction via <strong>extractSymbols()</strong> for editor-like features.</li>
      </ul>
    </div>

    <div class="grid-2">
      <div class="panel code-wrap">
        <h2>Comparison: semantic OFF</h2>
        <div id="previewOff"></div>
      </div>
      <div class="panel code-wrap">
        <h2>Comparison: semantic ON</h2>
        <div id="previewOn"></div>
      </div>
    </div>

    <div class="panel">
      <h2>Extracted Symbols</h2>
      <p class="muted">Live output from <strong>extractSymbols(source, language)</strong> for the current code.</p>
      <table class="symbols-table">
        <thead>
          <tr><th>Kind</th><th>Name</th><th>Start</th><th>End</th></tr>
        </thead>
        <tbody id="symbolsBody"></tbody>
      </table>
    </div>
  </div>

  <script>
    function normalizeDemoApi(candidate) {
      if (!candidate || typeof candidate !== "object") return undefined;
      if (typeof candidate.highlight === "function" && Array.isArray(candidate.builtinThemes)) {
        return candidate;
      }
      if ("demoApi" in candidate) {
        const unwrapped = candidate.demoApi;
        if (unwrapped && typeof unwrapped === "object" && typeof unwrapped.highlight === "function") {
          return unwrapped;
        }
      }
      return undefined;
    }

    const fromGlobalThisRaw = typeof globalThis !== "undefined" ? globalThis.TreeSitterTSHighlightDemo : undefined;
    const fromWindowRaw = typeof window !== "undefined" ? window.TreeSitterTSHighlightDemo : undefined;
    const fromVarRaw = typeof TreeSitterTSHighlightDemo !== "undefined" ? TreeSitterTSHighlightDemo : undefined;
    const demoApi = normalizeDemoApi(fromGlobalThisRaw) || normalizeDemoApi(fromWindowRaw) || normalizeDemoApi(fromVarRaw);
    if (!demoApi) {
      const bundleOk = typeof window !== "undefined" ? window.__TS_DEMO_BUNDLE_OK__ : undefined;
      const bundleError = typeof window !== "undefined" ? window.__TS_DEMO_BUNDLE_ERROR__ : undefined;
      throw new Error("Missing embedded demo bundle. Run npm run build && npm run demo:generate. bundleOk=" + String(bundleOk) + " bundleError=" + String(bundleError));
    }

    const { builtinThemes, highlight, extractSymbols, registerProfile } = demoApi;

    const samples = ${JSON.stringify(languageSamples)};
    const defaultThemeNames = ${JSON.stringify(themeNames)};

    const languageSelect = document.getElementById("language");
    const themeSelect = document.getElementById("theme");
    const sourceArea = document.getElementById("source");
    const renderBtn = document.getElementById("renderBtn");
    const semanticInput = document.getElementById("semantic");
    const lineNumbersInput = document.getElementById("lineNumbers");
    const customInput = document.getElementById("customInput");
    const dslBtn = document.getElementById("dslBtn");

    const preview = document.getElementById("preview");
    const previewOff = document.getElementById("previewOff");
    const previewOn = document.getElementById("previewOn");
    const symbolsBody = document.getElementById("symbolsBody");

    const themeMap = new Map(builtinThemes.map((theme) => [theme.name, theme]));

    const dslCode = ${JSON.stringify(dslCode)};
    const dslProfile = ${JSON.stringify(dslProfile)};

    function fillLanguages() {
      const entries = Object.entries(samples);
      languageSelect.innerHTML = entries
        .map(([id, item]) => '<option value="' + id + '">' + item.label + '</option>')
        .join("");
    }

    function fillThemes() {
      themeSelect.innerHTML = defaultThemeNames
        .map((name) => '<option value="' + name + '">' + name + '</option>')
        .join("");
    }

    function getSelectedCode() {
      const lang = languageSelect.value;
      if (customInput.checked) return sourceArea.value;
      return samples[lang] ? samples[lang].code : "";
    }

    function setSourceFromLanguage() {
      if (!customInput.checked) {
        sourceArea.value = samples[languageSelect.value] ? samples[languageSelect.value].code : "";
      }
    }

    function renderCode(html, theme) {
      return '<pre class="hlts" style="background:' + (theme.background != null ? theme.background : "#0f0f14") + ';color:' + (theme.foreground != null ? theme.foreground : "#e6e6e6") + '"><code>' + html + '</code></pre>';
    }

    function renderSymbols(source, language) {
      try {
        const symbols = extractSymbols(source, language);
        if (!symbols.length) {
          symbolsBody.innerHTML = '<tr><td colspan="4" class="muted">No symbols extracted for this sample.</td></tr>';
          return;
        }

        symbolsBody.innerHTML = symbols
          .slice(0, 24)
          .map((symbol) =>
            '<tr><td>' + symbol.kind + '</td><td>' + symbol.name + '</td><td>' + symbol.startLine + '</td><td>' + symbol.endLine + '</td></tr>'
          )
          .join("");
      } catch (error) {
        symbolsBody.innerHTML = '<tr><td colspan="4" class="muted">Symbol extraction is unavailable: ' + String(error) + '</td></tr>';
      }
    }

    function renderAll() {
      const language = languageSelect.value;
      const source = getSelectedCode();
      const theme = themeMap.get(themeSelect.value) || builtinThemes[0];
      const withLineNumbers = lineNumbersInput.checked;

      try {
        const selectedHtml = highlight(source, language, {
          theme,
          lineNumbers: withLineNumbers,
          semanticHighlighting: semanticInput.checked,
        });
        const baseHtml = highlight(source, language, {
          theme,
          lineNumbers: withLineNumbers,
          semanticHighlighting: false,
        });
        const semanticHtml = highlight(source, language, {
          theme,
          lineNumbers: withLineNumbers,
          semanticHighlighting: true,
        });

        preview.innerHTML = renderCode(selectedHtml, theme);
        previewOff.innerHTML = renderCode(baseHtml, theme);
        previewOn.innerHTML = renderCode(semanticHtml, theme);
      } catch (error) {
        const message = String(error);
        preview.innerHTML = '<pre class="hlts" style="background:#2b1d24;color:#ffb4c1"><code>' + message + '</code></pre>';
        previewOff.innerHTML = "";
        previewOn.innerHTML = "";
      }

      renderSymbols(source, language);
    }

    dslBtn.addEventListener("click", () => {
      if (!samples["pipeline-dsl"]) {
        registerProfile(dslProfile);
        samples["pipeline-dsl"] = { label: "Pipeline DSL (custom)", code: dslCode };
        fillLanguages();
        languageSelect.value = "pipeline-dsl";
        customInput.checked = false;
        setSourceFromLanguage();
        renderAll();
      }
    });

    renderBtn.addEventListener("click", renderAll);
    languageSelect.addEventListener("change", () => {
      setSourceFromLanguage();
      renderAll();
    });
    themeSelect.addEventListener("change", renderAll);
    semanticInput.addEventListener("change", renderAll);
    lineNumbersInput.addEventListener("change", renderAll);
    customInput.addEventListener("change", () => {
      if (!customInput.checked) {
        setSourceFromLanguage();
      }
      sourceArea.readOnly = !customInput.checked;
      renderAll();
    });
    sourceArea.addEventListener("input", () => {
      if (customInput.checked) {
        renderAll();
      }
    });

    fillLanguages();
    fillThemes();
    languageSelect.value = "typescript";
    themeSelect.value = "github-dark";
    sourceArea.readOnly = true;
    setSourceFromLanguage();
    renderAll();
  </script>
</body>
</html>`;

const outPath = join(__dirname, "index.html");
writeFileSync(outPath, html, "utf-8");

console.log(`Demo written to ${outPath}`);
console.log(`  ${Object.keys(languageSamples).length} built-in languages, ${themeNames.length} themes`);
console.log(`  Open in browser: file://${outPath.replace(/\\/g, "/")}`);
