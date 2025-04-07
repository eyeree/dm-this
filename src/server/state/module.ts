import * as fs from 'fs';
import * as path from 'path';

export class Module {

  /**
   * Load a Module instance by module ID
   * @param moduleId The ID of the module to load
   * @returns A Promise resolving to a Module instance
   */
  static async loadById(moduleId: string): Promise<Module> {
    const modulesBasePath = process.env.DM_THIS_MODULES;
    if (!modulesBasePath) {
      throw new Error('DM_THIS_MODULES environment variable is not defined');
    }
    
    const directoryPath = path.join(modulesBasePath, moduleId);
    return await this.load(directoryPath);
  }

  /**
   * Load a Module instance from a directory path
   * @param directoryPath Path to the module directory
   * @returns A Promise resolving to a Module instance
   */
  private static async load(directoryPath: string): Promise<Module> {
    const name = path.basename(directoryPath)
    const moduleFilePaths = await this.getModuleFilePaths(directoryPath)
    return new Module(name, moduleFilePaths);
  }
  
  /**
   * Gets the module files (PDFs) for this module
   */
  private static async getModuleFilePaths(directoryPath:string): Promise<string[]> {
    return (await fs.promises.readdir(directoryPath))
      .filter(file => file.endsWith('.pdf'))
      .map(file => path.join(directoryPath, file));
  }

  /**
   * Creates a new Module instance
   */
  private constructor(
    public readonly name:string, 
    public readonly moduleFilePaths:string[]
  ) {
  }

}
