// encode object values using `encodeURIComponent`
export function encodeJSON<T>(input: T): T {
  if (typeof input === 'string') {
    try {
      return encodeURIComponent(input) as unknown as T;
    } catch {
      return input;
    }
  } else if (Array.isArray(input)) {
    return input.map((item) => encodeJSON(item)) as unknown as T;
  } else if (input && typeof input === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = encodeJSON(value);
    }
    return result;
  }
  return input;
}
