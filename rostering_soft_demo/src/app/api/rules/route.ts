import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const rulesPath = path.join(process.cwd(), 'src', 'app', 'data', 'rules.json');
    const fileData = await fs.readFile(rulesPath, 'utf-8');
    const rules = JSON.parse(fileData);
    return NextResponse.json(rules);
  } catch (err) {
    console.error('Failed to read rules.json:', err);
    return NextResponse.json({});
  }
}
