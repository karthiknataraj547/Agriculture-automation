import { NextResponse } from 'next/server';
import { PREDEFINED_BOARDS } from './boardsData';

export async function GET(req: Request) {
  const family = new URL(req.url).searchParams.get('family');
  let boards = PREDEFINED_BOARDS;

  if (family && (family === 'ESP32' || family === 'ESP8266')) {
    boards = PREDEFINED_BOARDS.filter((b) => b.family === family);
  }

  return NextResponse.json({
    success: true,
    count: boards.length,
    boards,
  });
}
