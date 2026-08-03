import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Sale from '@/lib/models/Sale';
import Customer from '@/lib/models/Customer';
import Item from '@/lib/models/Item';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const sales = await Sale.find({})
      .populate('customerId')
      .populate('items.itemId')
      .populate('createdBy', 'name username')
      .sort({ date: -1, createdAt: -1 });
    return NextResponse.json({ success: true, data: sales });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    // Auth Check
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing' }, { status: 401 });
    }

    const body = await request.json();
    const { customer, items, paymentMode, date, notes } = body;

    // Validate request
    if (!customer || !customer.name || !customer.phone) {
      return NextResponse.json(
        { success: false, error: 'Customer name and phone number are required' },
        { status: 400 }
      );
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required in the sale' },
        { status: 400 }
      );
    }

    // 1. Resolve or create customer
    const cleanPhone = customer.phone.trim();
    let dbCustomer = await Customer.findOne({ phone: cleanPhone });
    if (!dbCustomer) {
      dbCustomer = await Customer.create({
        name: customer.name.trim(),
        phone: cleanPhone,
        address: customer.address ? customer.address.trim() : '',
      });
    } else if (customer.address && !dbCustomer.address) {
      // Update address if it wasn't set before
      dbCustomer.address = customer.address.trim();
      await dbCustomer.save();
    }

    // 2. Validate items, calculate total amount, and update stock
    let calculatedTotal = 0;
    const saleItems = [];

    for (const itemInput of items) {
      const { itemId, quantity, price } = itemInput;
      if (!itemId || quantity === undefined || price === undefined) {
        return NextResponse.json(
          { success: false, error: 'Each item must have itemId, quantity, and price' },
          { status: 400 }
        );
      }

      const qty = Number(quantity);
      const sellPrice = Number(price);

      if (qty <= 0 || sellPrice < 0) {
        return NextResponse.json(
          { success: false, error: 'Quantity must be greater than 0 and price must be non-negative' },
          { status: 400 }
        );
      }

      // Verify item exists
      const dbItem = await Item.findById(itemId);
      if (!dbItem) {
        return NextResponse.json({ success: false, error: `Item with ID ${itemId} not found` }, { status: 404 });
      }

      calculatedTotal += qty * sellPrice;
      saleItems.push({
        itemId,
        quantity: qty,
        price: sellPrice,
      });

      // Update stock level: subtract the quantity sold
      await Item.findByIdAndUpdate(itemId, { $inc: { stock: -qty } });
    }

    // 3. Generate sequential invoice number and cashier initials
    const getInitials = (fullName: string) => {
      if (!fullName) return 'EMP';
      return fullName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0].toUpperCase())
        .join('')
        .substring(0, 3);
    };
    const initials = getInitials(session.name);

    const lastSale = await Sale.findOne({}).sort({ invoiceSequence: -1 });
    const nextSequence = lastSale && lastSale.invoiceSequence ? lastSale.invoiceSequence + 1 : 1;
    const invoiceNumber = `${initials}${nextSequence}`;

    // 4. Create the sale transaction
    const newSale = await Sale.create({
      customerId: dbCustomer._id,
      items: saleItems,
      totalAmount: calculatedTotal,
      paymentMode: paymentMode || 'Cash',
      date: date ? new Date(date) : new Date(),
      notes: notes || '',
      invoiceSequence: nextSequence,
      invoiceNumber: invoiceNumber,
      createdBy: session.id,
    });

    return NextResponse.json({ success: true, data: newSale }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
