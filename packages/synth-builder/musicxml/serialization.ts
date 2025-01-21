function serializeToXml(obj: any, rootElementName: string): string {
  function toHyphenated(name: string): string {
    return name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  function buildXml(obj: any, nodeName: string): string {
    if (obj === null || obj === undefined) {
      return `<${nodeName}/>`;
    }

    if (
      typeof obj === "string" ||
      typeof obj === "number" ||
      typeof obj === "boolean"
    ) {
      return `<${nodeName}>${obj}</${nodeName}>`;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => buildXml(item, nodeName)).join("");
    }

    if (typeof obj === "object") {
      let attributes = "";
      let elements = "";

      for (const [key, value] of Object.entries(obj)) {
        const xmlKey = toHyphenated(key);
        if (value === null || value === undefined) continue;

        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          attributes += ` ${xmlKey}="${value}"`;
        } else {
          elements += buildXml(value, xmlKey);
        }
      }

      if (elements) {
        return `<${nodeName}${attributes}>${elements}</${nodeName}>`;
      } else {
        return `<${nodeName}${attributes}/>`;
      }
    }

    throw new Error(
      `Unsupported data type for XML serialization: ${typeof obj}`,
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n${buildXml(obj, rootElementName)}`;
}
