import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Sale from '@/lib/models/Sale';
import Customer from '@/lib/models/Customer';
import Item from '@/lib/models/Item';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();

    // Auto-consolidate any duplicate sales for the same customer to ensure zero duplicate entries
    const rawSales = await Sale.find({ customerId: { $ne: null } })
      .populate('customerId')
      .populate('items.itemId')
      .sort({ createdAt: 1, invoiceSequence: 1 });

    const customerMap = new Map<string, any[]>();
    for (const s of rawSales) {
      if (!s.customerId || !s.customerId._id) continue;
      const cId = s.customerId._id.toString();
      if (!customerMap.has(cId)) {
        customerMap.set(cId, []);
      }
      customerMap.get(cId)!.push(s);
    }

    for (const [cId, salesList] of customerMap.entries()) {
      if (salesList.length > 1) {
        const primary = salesList[0];
        const extras = salesList.slice(1);

        const allItems = [...primary.items];
        for (const extra of extras) {
          if (Array.isArray(extra.items)) {
            for (const it of extra.items) {
              allItems.push({
                itemId: it.itemId?._id || it.itemId,
                quantity: it.quantity,
                price: it.price,
              });
            }
          }
        }

        const totalAmount = allItems.reduce(
          (acc, it) => acc + (Number(it.quantity) * Number(it.price)),
          0
        );

        const extraNotes = extras.map(e => 
          `[#${e.invoiceNumber || 'INV'}: ${new Date(e.date).toLocaleDateString()}${e.notes ? ` - ${e.notes}` : ''}]`
        ).join(' | ');

        primary.items = allItems;
        primary.totalAmount = totalAmount;
        if (extraNotes) {
          primary.notes = primary.notes ? `${primary.notes} | ${extraNotes}` : extraNotes;
        }

        const latestTime = salesList.reduce((max, s) => {
          const t = new Date(s.date).getTime();
          return t > max ? t : max;
        }, new Date(primary.date).getTime());
        primary.date = new Date(latestTime);

        if (!primary.invoiceNumber || !primary.invoiceSequence) {
          const lastSeq = await Sale.findOne({ invoiceSequence: { $exists: true } }).sort({ invoiceSequence: -1 });
          const seq = lastSeq && lastSeq.invoiceSequence ? lastSeq.invoiceSequence + 1 : 1;
          primary.invoiceSequence = seq;
          primary.invoiceNumber = `INV${seq}`;
        }

        await primary.save();
        const extraIds = extras.map(e => e._id);
        await Sale.deleteMany({ _id: { $in: extraIds } });
      }
    }

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
    const { customer, items, paymentMode, date, notes, isNewCustomer = false, discount = 0 } = body;
    const discountVal = Math.max(0, Number(discount) || 0);

    // Validate request
    if (!customer || !customer.name) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required' },
        { status: 400 }
      );
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one item is required in the sale' },
        { status: 400 }
      );
    }

    const cleanName = customer.name.trim();
    const cleanPhone = customer.phone ? customer.phone.trim() : '';

    // 1. Resolve or create customer
    let dbCustomer = null;

    if (!isNewCustomer) {
      // 1a. Try resolving by customer ID if provided
      if (customer.id) {
        dbCustomer = await Customer.findById(customer.id);
      }
      // 1b. If not found, try resolving by phone
      if (!dbCustomer && cleanPhone) {
        dbCustomer = await Customer.findOne({ phone: cleanPhone });
      }
      // 1c. If not found, auto-detect by exact name (case-insensitive)
      if (!dbCustomer && cleanName) {
        const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        dbCustomer = await Customer.findOne({
          name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
        });
      }
    }

    if (dbCustomer) {
      // Update address if provided and not previously recorded
      if (customer.address && (!dbCustomer.address || customer.address.trim() !== dbCustomer.address)) {
        dbCustomer.address = customer.address.trim();
        await dbCustomer.save();
      }
    } else {
      // Need a phone number for new customer profile
      if (!cleanPhone) {
        return NextResponse.json(
          { success: false, error: 'Phone number is required to register a new customer profile' },
          { status: 400 }
        );
      }

      // Check if phone number is already registered
      const phoneConflict = await Customer.findOne({ phone: cleanPhone });
      if (phoneConflict) {
        if (!isNewCustomer) {
          // If not explicitly flagged as new customer, use this existing profile
          dbCustomer = phoneConflict;
        } else {
          return NextResponse.json(
            { 
              success: false, 
              error: `Phone number ${cleanPhone} is already in use by customer "${phoneConflict.name}". Either uncheck "Create as new customer" to use their profile or enter a distinct phone number.` 
            },
            { status: 409 }
          );
        }
      } else {
        dbCustomer = await Customer.create({
          name: cleanName,
          phone: cleanPhone,
          address: customer.address ? customer.address.trim() : '',
        });
      }
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

    // 3. Check for existing sale record to append into (if existing customer and not flagged as new)
    if (!isNewCustomer && dbCustomer) {
      const escapedName = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingCustomerIds = await Customer.find({
        $or: [
          { _id: dbCustomer._id },
          ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } }
        ]
      }).distinct('_id');

      const existingSale = await Sale.findOne({
        $or: [
          { customerId: { $in: matchingCustomerIds } },
          { customerId: dbCustomer._id },
          { customerId: dbCustomer._id.toString() }
        ]
      }).sort({ date: -1, createdAt: -1 });

      if (existingSale) {
        // Append new items into the existing sale document
        existingSale.items.push(...saleItems);
        const incrementalTotal = Math.max(0, calculatedTotal - discountVal);
        existingSale.totalAmount = (existingSale.totalAmount || 0) + incrementalTotal;
        existingSale.discount = (existingSale.discount || 0) + discountVal;
        
        let appendNotes = notes || '';
        if (discountVal > 0) {
          appendNotes = appendNotes ? `${appendNotes} (Discount: ₹${discountVal})` : `Discount: ₹${discountVal}`;
        }
        if (appendNotes) {
          existingSale.notes = existingSale.notes
            ? `${existingSale.notes} | ${appendNotes}`
            : appendNotes;
        }
        if (paymentMode) {
          existingSale.paymentMode = paymentMode;
        }
        if (date) {
          existingSale.date = new Date(date);
        }

        // Ensure customerId points to resolved customer ID
        existingSale.customerId = dbCustomer._id;

        // Ensure valid invoiceNumber & invoiceSequence if document was missing them
        if (!existingSale.invoiceNumber || !existingSale.invoiceSequence) {
          const lastSale = await Sale.findOne({ invoiceSequence: { $exists: true } }).sort({ invoiceSequence: -1 });
          const nextSeq = lastSale && lastSale.invoiceSequence ? lastSale.invoiceSequence + 1 : 1;
          existingSale.invoiceSequence = nextSeq;
          existingSale.invoiceNumber = `INV${nextSeq}`;
        }

        await existingSale.save();
        await existingSale.populate('customerId');
        await existingSale.populate('items.itemId');

        return NextResponse.json({
          success: true,
          isAppended: true,
          message: `Sale items successfully added to existing invoice #${existingSale.invoiceNumber}`,
          data: existingSale,
        }, { status: 200 });
      }
    }

    // 4. Generate sequential invoice number and cashier initials for new sale
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

    // 5. Create new sale transaction
    const finalTotal = Math.max(0, calculatedTotal - discountVal);
    const newSale = await Sale.create({
      customerId: dbCustomer._id,
      items: saleItems,
      discount: discountVal,
      totalAmount: finalTotal,
      paymentMode: paymentMode || 'Cash',
      date: date ? new Date(date) : new Date(),
      notes: notes || '',
      invoiceSequence: nextSequence,
      invoiceNumber: invoiceNumber,
      createdBy: session.id,
    });

    await newSale.populate('customerId');
    await newSale.populate('items.itemId');

    return NextResponse.json({ success: true, isAppended: false, data: newSale }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSessionUser();

    // Role Guard: Only admins can delete sales history
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Session missing' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access required to delete sales history' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const { ids, all, restoreStock = true } = body;

    let targetSales = [];
    if (all === true) {
      targetSales = await Sale.find({});
    } else if (Array.isArray(ids) && ids.length > 0) {
      targetSales = await Sale.find({ _id: { $in: ids } });
    } else {
      return NextResponse.json(
        { success: false, error: 'Please provide sale IDs array or specify all: true' },
        { status: 400 }
      );
    }

    if (targetSales.length === 0) {
      return NextResponse.json({ success: false, error: 'No matching sales records found to delete' }, { status: 404 });
    }

    // Revert stock for all target sales
    if (restoreStock) {
      for (const sale of targetSales) {
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
    }

    const saleIds = targetSales.map(s => s._id);
    await Sale.deleteMany({ _id: { $in: saleIds } });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${saleIds.length} sale records and restored stock`,
      count: saleIds.length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

