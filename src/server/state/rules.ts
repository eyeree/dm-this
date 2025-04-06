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
  static async load(directoryPath: string): Promise<Rules> {    
    return new Rules(directoryPath);
  }
  
  /**
   * Creates a new Rules instance
   * @param directoryPath The path to the rule set directory
   * @param name The name of the rule set, defaults to basename of directoryPath
   */
  constructor(
    private directoryPath: string,
    public readonly name: string = path.basename(directoryPath) 
  ) {}

  /**
   * Get the directory path for this rule set
   */
  get path(): string {
    return this.directoryPath;
  }

  /**
   * Get the rule files (PDFs) for this rule set
   */
  getRuleFilePaths(): string[] {
    return fs.readdirSync(this.directoryPath)
      .filter(file => file.endsWith('.pdf'))
      .map(file => path.join(this.directoryPath, file));
  }

}
