import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Sale from '@/lib/models/Sale';
import Item from '@/lib/models/Item';
import { getSessionUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = await params;
    const sale = await Sale.findById(id)
      .populate('customerId')
      .populate('items.itemId')
      .populate('createdBy', 'name username');
    if (!sale) {
      return NextResponse.json({ success: false, error: 'Sale record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: sale });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSessionUser();

    // Role Guard: Only admins can delete sales history
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required to delete sales' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const sale = await Sale.findById(id);
    if (!sale) {
      return NextResponse.json({ success: false, error: 'Sale record not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const restoreStock = url.searchParams.get('restoreStock') !== 'false'; // default true

    // Revert inventory stock for all sold items in this sale
    if (restoreStock && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        if (item.itemId && item.quantity > 0) {
          await Item.findByIdAndUpdate(item.itemId, {
            $inc: { stock: item.quantity }
          });
        }
      }
    }

    await Sale.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Sale deleted successfully and stock restored',
      data: { id }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
