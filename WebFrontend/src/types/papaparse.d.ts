declare module 'papaparse' {
  export interface ParseError {
    type: string;
    code: string;
    message: string;
    row: number;
  }

  export interface ParseMeta {
    aborted: boolean;
    cursor: number;
    delimiter: string;
    linebreak: string;
    truncated: boolean;
    fields?: string[];
  }

  export interface ParseResult<T> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    header?: boolean;
    dynamicTyping?: boolean | { [key: string]: boolean };
    skipEmptyLines?: boolean | 'greedy';
    comments?: boolean | string;
    download?: boolean;
    worker?: boolean;
    fastMode?: boolean;
    withCredentials?: boolean;
    transformHeader?: (header: string) => string;
    transform?: (value: any, field?: string) => any;
  }

  export function parse<T extends Record<string, any> = Record<string, any>>(
    input: string | File,
    config?: ParseConfig
  ): ParseResult<T>;

  const _default: { parse: typeof parse };
  export default _default;
}
