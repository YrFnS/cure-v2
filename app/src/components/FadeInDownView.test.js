import { expect, test } from "bun:test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const componentSource = await readFile(
  new URL("./FadeInDownView.tsx", import.meta.url),
  "utf8",
);
const reduceMotionSource = await readFile(
  new URL("../lib/use-reduced-motion.ts", import.meta.url),
  "utf8",
);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    if (
      entry.isFile() &&
      /\.[jt]sx?$/.test(entry.name) &&
      !/\.test\.[jt]sx?$/.test(entry.name)
    ) {
      files.push(path);
    }
  }
  return files;
}

function delimitedExpression(source, start) {
  const opening = source[start];
  const closing = { '"': '"', "'": "'", "`": "`", "{": "}", "(": ")" }[opening];
  if (!closing) return "";

  if ("\"'`".includes(opening)) {
    for (let index = start + 1; index < source.length; index += 1) {
      if (source[index] === "\\") index += 1;
      else if (source[index] === closing) return source.slice(start, index + 1);
    }
    return source.slice(start);
  }

  let depth = 1;
  let quote;
  for (let index = start + 1; index < source.length; index += 1) {
    if (quote) {
      if (source[index] === "\\") index += 1;
      else if (source[index] === quote) quote = undefined;
    } else if ("\"'`".includes(source[index])) {
      quote = source[index];
    } else if (source[index] === opening) {
      depth += 1;
    } else if (source[index] === closing && --depth === 0) {
      return source.slice(start, index + 1);
    }
  }
  return source.slice(start);
}

function hasForbiddenHostPath(source) {
  if (
    /\b(?:from\s+|import\s*(?:\(\s*)?|require\s*\(\s*)['"]react-native-reanimated(?:\/[^'"]*)?['"]/.test(
      source,
    )
  ) {
    return true;
  }

  const nativeWindHost =
    /^(?:\S+:)*!?(?:(?:animate|transition)(?:-(?:\[[^\]\s]+\]|[\w-]+))?|(?:duration|delay|ease)-(?:\[[^\]\s]+\]|[\w-]+))$/;
  const contexts = [
    ...source.matchAll(/\bclassName\s*=\s*|\b(?:cn|clsx|twMerge)\s*(?=\()/g),
  ].map((match) => delimitedExpression(source, match.index + match[0].length));
  return contexts.some((context) =>
    [...context.matchAll(/(?=(["'`])((?:(?!\1)[^\\]|\\[\s\S])*)\1)/g)].some(
      ([, , literal]) =>
        literal.split(/\s+/).some((token) => nativeWindHost.test(token)),
    ),
  );
}

test("preserves FadeInDown without Reanimated animated views", async () => {
  expect(reduceMotionSource).toContain(
    "AccessibilityInfo.isReduceMotionEnabled()",
  );
  expect(reduceMotionSource).toContain(
    "addEventListener('reduceMotionChanged'",
  );
  expect(reduceMotionSource).toContain(".catch(() =>");
  expect(componentSource).toContain("if (hasEntered.current)");
  expect(componentSource).toContain("new Animated.Value(1)");
  expect(componentSource).not.toContain("progress.setValue(0)");
  expect(componentSource).toContain("useNativeDriver: true");
  expect(componentSource).toContain("easing: Easing.inOut(Easing.quad)");
  expect(componentSource).toContain("outputRange: [25, 0]");

  for (const source of [
    'import Animated from "react-native-reanimated";',
    "import 'react-native-reanimated/layoutReanimation';",
    'const Animated = require("react-native-reanimated");',
    'const Animated = await import("react-native-reanimated/src/Animated");',
    'className="transition animate"',
    "className={`motion-safe:transition-[opacity] animate-[fade_250ms_ease-in]`}",
    "className={`card ${loading ? 'animate-pulse' : ''}`}",
    'className="delay-75"',
    "className={active ? 'duration-300' : ''}",
    "className={`card ${active ? 'ease-in-out' : ''}`}",
    "const classes = cn('card', active && 'transition-opacity');",
  ]) {
    expect(hasForbiddenHostPath(source)).toBe(true);
  }
  expect(
    hasForbiddenHostPath(
      'className="animated-card transitioning my-animate-pulse motion-transition-safe"',
    ),
  ).toBe(false);
  expect(
    hasForbiddenHostPath(
      "const phase = 'transition'; const wait = 'duration-300';",
    ),
  ).toBe(false);

  const sourceRoot = fileURLToPath(new URL("../", import.meta.url));
  const files = await sourceFiles(sourceRoot);
  const reanimatedHostPaths = [];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (hasForbiddenHostPath(source)) {
      reanimatedHostPaths.push(file);
    }
  }
  expect(reanimatedHostPaths).toEqual([]);
});
