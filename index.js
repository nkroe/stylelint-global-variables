/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require("fs");
const postcss = require("postcss");
const postcssLess = require("postcss-less");
const stylelint = require("stylelint");
const utils = require("./utils");

const ruleName = "@itgenio/global-variables";
const IGNORED_PROPS = [];

const getVariablesByValueDict = (variablesPath) => {
  try {
    const variablesFile = fs.readFileSync(variablesPath, "utf8");

    const lessAST = postcssLess.parse(variablesFile);

    if (!lessAST) return undefined;

    const atRules = lessAST.nodes.filter(({ type, variable }) => {
      return type === "atrule" && variable;
    });

    return atRules.reduce((variables, { name, value }) => {
      variables[value] = name;

      return variables;
    }, {});
  } catch (e) {
    return undefined;
  }
};

const isIgnoredProp = (prop) => {
  return IGNORED_PROPS.some((ignoredProp) => prop.includes(ignoredProp));
};

const addImportVariables = (root, variablesPath) => {
  const hasImport = root.nodes.some((node) => {
    return (
      node.type === "atrule" &&
      node.import &&
      node.filename &&
      variablesPath.includes(node.filename.replace(/\{|\}|"/gi, ""))
    );
  });

  if (hasImport) return;

  const importPath = `{}${variablesPath.replace(".less", "").replace(".", "")}`;

  root.nodes.unshift(
    postcss.parse(`@import (reference) "${importPath}"; \r\n`)
  );
};

const messages = stylelint.utils.ruleMessages(ruleName, {
  expected: (actual, expected) => `Expected "${actual}" to be "${expected}"`,
});

module.exports = stylelint.createPlugin(
  ruleName,
  function (options, _, context) {
    return function (root, result) {
      const validOptions = stylelint.utils.validateOptions(result, ruleName, {
        actual: options.variablesPath,
        possible: [utils.isString],
      });

      if (!validOptions) return;

      const includesPaths = options.includes || [];

      const sourcePath = root.source ? root.source.input.from : undefined;

      if (!sourcePath) return;

      const canCheckFile = utils.validatePath(includesPaths, sourcePath);

      if (!canCheckFile) return;

      const baseDir = options.baseDir || "";
      const variablesPath =
        "./" + `${baseDir}/${options.variablesPath}`.replace(/\.\//g, "");

      const variablesByValueDict = getVariablesByValueDict(variablesPath);

      if (!variablesByValueDict) return;

      let isVariablesImported = false;

      const getVariable = (value) =>
        variablesByValueDict[value]
          ? `@${variablesByValueDict[value]}`
          : undefined;

      const variableHandler = (decl, variable, newValue, oldValue) => {
        if (context.fix && options.fixible) {
          if (!isVariablesImported) {
            addImportVariables(root, options.variablesPath);

            isVariablesImported = true;
          }

          utils.setDeclarationValue(decl, newValue);

          return;
        }

        stylelint.utils.report({
          message: messages.expected(oldValue, variable),
          node: decl,
          index: utils.declarationValueIndex(decl),
          word: oldValue,
          result,
          ruleName,
        });
      };

      root.walkDecls((decl) => {
        if (isIgnoredProp(decl.prop)) return;

        const fullValue = utils.getDeclarationValue(decl);

        const variable = getVariable(fullValue);

        if (variable) {
          variableHandler(decl, variable, variable, fullValue);

          return;
        }

        const partsOfValue = fullValue.split(" ");

        partsOfValue.forEach((partOfValue) => {
          const variable = getVariable(partOfValue);

          if (!variable) return;

          variableHandler(
            decl,
            variable,
            fullValue.replace(partOfValue, variable),
            partOfValue
          );
        });
      });
    };
  }
);

module.exports.ruleName = ruleName;
module.exports.messages = messages;
