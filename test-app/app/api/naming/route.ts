import { NextRequest, NextResponse } from 'next/server';
import {
  hazo_files_generate_file_name,
  hazo_files_generate_folder_name,
  validateNamingRuleSchema,
} from 'hazo_files';
import type { NamingRuleSchema, NameGenerationOptions } from 'hazo_files';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, schema, variables, originalFileName, options } = body;

    // Validate schema
    if (!validateNamingRuleSchema(schema)) {
      return NextResponse.json(
        { success: false, error: 'Invalid naming rule schema' },
        { status: 400 }
      );
    }

    // Parse date option if provided
    const genOptions: NameGenerationOptions = {};
    if (options?.date) {
      genOptions.date = new Date(options.date);
    }
    if (options?.counterValue !== undefined) {
      genOptions.counterValue = options.counterValue;
    }
    if (options?.counterDigits !== undefined) {
      genOptions.counterDigits = options.counterDigits;
    }

    switch (action) {
      case 'generate_file_name': {
        const result = hazo_files_generate_file_name(
          schema as NamingRuleSchema,
          variables,
          originalFileName,
          genOptions
        );
        return NextResponse.json(result);
      }

      case 'generate_folder_name': {
        const result = hazo_files_generate_folder_name(
          schema as NamingRuleSchema,
          variables,
          genOptions
        );
        return NextResponse.json(result);
      }

      case 'generate_both': {
        const fileResult = hazo_files_generate_file_name(
          schema as NamingRuleSchema,
          variables,
          originalFileName,
          genOptions
        );
        const folderResult = hazo_files_generate_folder_name(
          schema as NamingRuleSchema,
          variables,
          genOptions
        );
        return NextResponse.json({
          file: fileResult,
          folder: folderResult,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Naming API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
