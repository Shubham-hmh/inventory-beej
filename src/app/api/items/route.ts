import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/lib/models/Item';

export async function GET() {
  try {
    await dbConnect();
    const items = await Item.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, category, price, stock, unit } = body;

    if (!name || !category || price === undefined) {
      return NextResponse.json({ success: false, error: 'Name, Category, and Price are required' }, { status: 400 });
    }

    const newItem = await Item.create({
      name,
      category,
      price: Number(price),
      stock: Number(stock || 0),
      unit: unit || 'kg',
    });

    return NextResponse.json({ success: true, data: newItem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
