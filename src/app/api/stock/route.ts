import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StockInput from '@/lib/models/StockInput';
import Item from '@/lib/models/Item';

export async function GET() {
  try {
    await dbConnect();
    const stockLogs = await StockInput.find({})
      .populate('itemId')
      .sort({ date: -1, createdAt: -1 });
    return NextResponse.json({ success: true, data: stockLogs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { itemId, quantity, unitPrice, date, supplier, notes } = body;

    if (!itemId || quantity === undefined || unitPrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Item ID, quantity, and unit price are required' },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (qty <= 0 || price < 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be greater than 0 and price must be non-negative' },
        { status: 400 }
      );
    }

    // Verify the item exists
    const item = await Item.findById(itemId);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    // Create stock entry
    const newStock = await StockInput.create({
      itemId,
      quantity: qty,
      unitPrice: price,
      date: date ? new Date(date) : new Date(),
      supplier: supplier || '',
      notes: notes || '',
    });

    // Update item stock quantity
    await Item.findByIdAndUpdate(itemId, { $inc: { stock: qty } });

    return NextResponse.json({ success: true, data: newStock }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
