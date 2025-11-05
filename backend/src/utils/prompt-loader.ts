import fs from 'fs';
import path from 'path';

/**
 * Load a prompt template from file
 */
export function loadPrompt(category: string, name: string): string {
  const promptPath = path.join(__dirname, '..', 'prompts', category, `${name}.txt`);

  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to load prompt: ${promptPath}`, error);
    throw new Error(`Prompt file not found: ${category}/${name}.txt`);
  }
}

/**
 * Replace template variables in prompt
 * Example: "Hello {{name}}" with {name: "World"} => "Hello World"
 */
export function fillPromptTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  return result;
}

/**
 * Load and fill a prompt template
 */
export function getPrompt(
  category: string,
  name: string,
  variables: Record<string, string> = {}
): string {
  const template = loadPrompt(category, name);
  return fillPromptTemplate(template, variables);
}
