export type RockCLIOption = {
  name: string;
  description: string;
  default?: string;
  parse?: (args: string) => string | string[];
};

export type RockCLIOptions = RockCLIOption[];

export type RequireAllOrNone<T> = T | { [K in keyof T]?: never };
