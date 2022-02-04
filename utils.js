function setDeclarationValue(decl, value) {
  const raws = decl.raws;

  if (raws.value) {
    raws.value.raw = value;
  } else {
    decl.value = value;
  }

  return decl;
}

function declarationValueIndex(decl) {
  const raws = decl.raws;

  return [
    raws.prop && raws.prop.prefix,
    (raws.prop && raws.prop.raw) || decl.prop,
    raws.prop && raws.prop.suffix,
    raws.between || ":",
    raws.value && raws.value.prefix,
  ].reduce((count, str) => {
    if (str) {
      return count + str.length;
    }

    return count;
  }, 0);
}

function isString(value) {
  return typeof value === "string" || value instanceof String;
}

function getDeclarationValue(decl) {
  const raws = decl.raws;

  return (raws.value && raws.value.raw) || decl.value;
}

const validatePath = (allowedPaths, sourcePath) => {
  if (allowedPaths.length === 0) return true;

  const regExps = allowedPaths.map((allowedPath) => {
    const regExpPath = allowedPath
      .replace("./", "(.+)?")
      .replace("**", ".+")
      .replace("*.", "\\w+.");

    return new RegExp(regExpPath);
  });

  const sourcePathWithReplacedSlashes = sourcePath.replace(/\\/g, "/");

  return regExps.some((regExp) => regExp.test(sourcePathWithReplacedSlashes));
};

module.exports = {
  setDeclarationValue,
  declarationValueIndex,
  isString,
  getDeclarationValue,
  validatePath,
};
