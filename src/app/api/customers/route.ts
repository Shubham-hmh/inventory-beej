import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Customer from '@/lib/models/Customer';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const customers = await Customer.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, phone, address } = body;

    if (!name || !phone) {
      return NextResponse.json({ success: false, error: 'Name and Phone number are required' }, { status: 400 });
    }

    // Check if phone number already exists
    const existing = await Customer.findOne({ phone: phone.trim() });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Customer with this phone number already exists', data: existing }, { status: 409 });
    }

    const newCustomer = await Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
    });

    return NextResponse.json({ success: true, data: newCustomer }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Please provide customer IDs array to delete' }, { status: 400 });
    }

    const result = await Customer.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} customer profile(s)`,
      count: result.deletedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

