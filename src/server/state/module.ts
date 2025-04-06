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
  static async load(directoryPath: string): Promise<Module> {    
    return new Module(directoryPath);
  }
  
  private moduleFiles: string[] = [];

  /**
   * Creates a new Module instance
   * @param directoryPath The path to the module directory
   * @param name The name of the module, defaults to basename of directoryPath
   */
  constructor(
    private directoryPath: string,
    public readonly name: string = path.basename(directoryPath) 
  ) {
    this.loadModuleFiles();
  }

  /**
   * Get the directory path for this module
   */
  get path(): string {
    return this.directoryPath;
  }

  /**
   * Loads the module PDF files.
   */
  private loadModuleFiles(): void {
    if (fs.existsSync(this.directoryPath)) {
      this.moduleFiles = fs.readdirSync(this.directoryPath)
        .filter(file => file.endsWith('.pdf'));
    }
  }

  /**
   * Gets the module files (PDFs) for this module
   */
  getModuleFilePaths(): string[] {
    return this.moduleFiles.map(file => path.join(this.directoryPath, file));
  }

  /**
   * Gets the raw list of module filenames
   */
  getModuleFiles(): string[] {
    return [...this.moduleFiles];
  }
}
