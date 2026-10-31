const COMMAND_COLUMN = 36;

/** One line of the help: the command as it is typed, then what it does, lined up in a column. */
export function commandRow(command: string, form: string, text: string): string {
  return `  ${`${command} ${form}`.padEnd(COMMAND_COLUMN)}${text}`;
}
