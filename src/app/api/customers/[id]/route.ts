import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';
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
    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
    const body = await request.json();
    const { name, phone, address } = body;

    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    if (phone && phone.trim() !== existingCustomer.phone) {
      const duplicate = await Customer.findOne({ phone: phone.trim(), _id: { $ne: id } });
      if (duplicate) {
        return NextResponse.json({ success: false, error: 'Phone number already registered to another customer' }, { status: 409 });
      }
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(address !== undefined && { address: address.trim() }),
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: updatedCustomer });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await getSessionUser();

    // Role Guard: Only admins can delete customers
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required to delete customers' }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const deleteSales = url.searchParams.get('deleteSales') === 'true';

    if (deleteSales) {
      // Find all sales for this customer and revert inventory stock
      const customerSales = await Sale.find({ customerId: id });
      for (const sale of customerSales) {
        if (Array.isArray(sale.items)) {
          for (const item of sale.items) {
            if (item.itemId && item.quantity > 0) {
              await Item.findByIdAndUpdate(item.itemId, {
                $inc: { stock: item.quantity }
              });
            }
          }
        }
      }
      await Sale.deleteMany({ customerId: id });
    }

    await Customer.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: deleteSales
        ? 'Customer and associated sales deleted successfully, stock restored'
        : 'Customer deleted successfully',
      data: { id }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
