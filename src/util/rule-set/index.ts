import * as fs from 'fs';
import * as path from 'path';
import { OpenAI } from 'openai';
import { File } from 'buffer';

function getOpenAIClient() {

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const client = new OpenAI({ 
    apiKey: process.env.OPENAI_API_KEY,
  });

  return client

}

export class RuleSetProcessor {

  async process(directory_path:string) {

    const file_ids = await this.upload_files(directory_path)
    console.log('file_ids', file_ids);

  }

  private async upload_files(directory_path:string) {

    const file_paths = fs.readdirSync(directory_path)
      .filter(file_name => file_name.endsWith('.pdf'))
      .map(file_name => path.join(directory_path, file_name));

    return await Promise.all(
      file_paths.map(file_path => this.upload_file(file_path))
    )

  }

  private async upload_file(file_path:string) {
    
    console.log(`Uploading ${file_path}...`)
    
    const client = getOpenAIClient()

    const buffer = await fs.promises.readFile(file_path);

    const file = new File([buffer], path.basename(file_path), {
      type: 'application/pdf'
    });

    const result = await client.files.create({
      file: file,
      purpose: 'assistants'
    })

    return result.id

  }

}

interface RuleSetConfig {
  vectorStoreId:string
}

export class RuleSet {

  static async load(directoryPath: string) {

    var ruleSetFilePath = path.join(directoryPath, 'rule-set.json')
    const config = JSON.parse(await fs.promises.readFile(ruleSetFilePath, 'utf-8')) as RuleSetConfig;

    const name = path.basename(directoryPath);
    return new RuleSet(name, config)

  }
  
  constructor(public readonly name: string, private config:RuleSetConfig) {    
  }

  get vectorStoreId() {
    return this.config.vectorStoreId
  }

  async getRuleSetContext(query: string, max_num_results: number = 5) {
    const client = getOpenAIClient();
    const search_results = await client.vectorStores.search(this.vectorStoreId, {
      query,
      max_num_results
    })
    const contexts:Array<string> = []
    for await (const search_result of search_results) {
      contexts.push(...search_result.content.map(content => content.text))
    }
    return contexts.join('\n\n')
  }

  async getRuleSetResponse(query: string) {
    const client = getOpenAIClient()
    const result = await client.responses.create({
      instructions: `
        You are an expert at analyzing role playing game rules and answering player questions.
        Answer the following question based on the provided context.
        If you don't know the answer or it's not in the context, say so - don't make up information.
      `,
      input: query,
      model: 'chatgpt-4o-latest',
      tools: [{
        "type": "file_search",
        "vector_store_ids": [this.vectorStoreId]
      }]
    });
    return result.output_text
  }

}
