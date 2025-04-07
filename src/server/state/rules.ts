import * as fs from 'fs';
import * as path from 'path';

export class Rules {

  /**
   * Load a Rules instance by rule ID
   * @param ruleId The ID of the rule set to load
   * @returns A Promise resolving to a Rules instance
   */
  static async loadById(ruleId: string): Promise<Rules> {
    const rulesBasePath = process.env.DM_THIS_RULES;
    if (!rulesBasePath) {
      throw new Error('DM_THIS_RULES environment variable is not defined');
    }
    const directoryPath = path.join(rulesBasePath, ruleId);
    return await this.load(directoryPath);
  }

  /**
   * Load a Rules instance from a directory path
   * @param directoryPath Path to the rule set directory
   * @returns A Promise resolving to a Rules instance
   */
  private static async load(directoryPath: string): Promise<Rules> {
    const name = path.basename(directoryPath)
    const ruleFilePaths = await this.getRuleFilePaths(directoryPath)
    return new Rules(name, ruleFilePaths);
  }
  
  /**
   * Get the rule files (PDFs) for this rule set
   */
  private static async getRuleFilePaths(directoryPath:string): Promise<string[]> {
    return (await fs.promises.readdir(directoryPath))
      .filter(file => file.endsWith('.pdf'))
      .map(file => path.join(directoryPath, file));
  }

  /**
   * Creates a new Rules instance
   * @param directoryPath The path to the rule set directory
   * @param name The name of the rule set, defaults to basename of directoryPath
   */
  private constructor(
    public readonly name:string,
    public readonly ruleFilePaths:string[]
  ) {}

}
