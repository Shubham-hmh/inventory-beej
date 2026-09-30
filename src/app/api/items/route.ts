import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/lib/models/Item';
import Sale from '@/lib/models/Sale';
import StockInput from '@/lib/models/StockInput';

function normalize(str?: string | null): string {
  if (!str) return '';
  const s = str.trim().toLowerCase();
  if (['no brand', 'no variety', 'na', 'n/a', 'none', '-'].includes(s)) return '';
  return s;
}

function getItemKey(item: any): string {
  const n = normalize(item.name);
  const b = normalize(item.brand);
  const v = normalize(item.variety);
  return `${n}___${b}___${v}`;
}

export async function GET() {
  try {
    await dbConnect();
    const rawItems = await Item.find({}).sort({ createdAt: 1 });
    
    // Group items by normalized key (name + brand + variety)
    const itemMap = new Map<string, any[]>();
    for (const item of rawItems) {
      const key = getItemKey(item);
      if (!itemMap.has(key)) {
        itemMap.set(key, []);
      }
      itemMap.get(key)!.push(item);
    }

    // Consolidate duplicate items
    for (const [, duplicateList] of itemMap.entries()) {
      if (duplicateList.length > 1) {
        const primary = duplicateList[0];
        const duplicates = duplicateList.slice(1);
        const duplicateIds = duplicates.map(d => d._id);

        // Accumulate stock across all duplicate documents
        let extraStock = 0;
        for (const dup of duplicates) {
          extraStock += Number(dup.stock || 0);
        }
        primary.stock = (Number(primary.stock || 0)) + extraStock;

        // Keep highest valid selling price if secondary has higher price
        const maxPrice = Math.max(...duplicateList.map(d => Number(d.price || 0)));
        if (maxPrice > 0) {
          primary.price = maxPrice;
        }

        await primary.save();

        // Re-link Sale references to point to primary._id
        await Sale.updateMany(
          { 'items.itemId': { $in: duplicateIds } },
          { $set: { 'items.$[elem].itemId': primary._id } },
          { arrayFilters: [{ 'elem.itemId': { $in: duplicateIds } }] }
        );

        // Re-link StockInput references to point to primary._id
        await StockInput.updateMany(
          { itemId: { $in: duplicateIds } },
          { $set: { itemId: primary._id } }
        );

        // Remove secondary duplicate item documents
        await Item.deleteMany({ _id: { $in: duplicateIds } });
      }
    }

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
    const { name, category, price, stock, unit, brand, variety } = body;

    if (!name || !category || price === undefined) {
      return NextResponse.json({ success: false, error: 'Name, Category, and Price are required' }, { status: 400 });
    }

    const normName = normalize(name);
    const normBrand = normalize(brand);
    const normVariety = normalize(variety);

    // Look for existing item with matching normalized name, brand, variety
    const allItems = await Item.find({});
    const existing = allItems.find(it => getItemKey(it) === `${normName}___${normBrand}___${normVariety}`);

    if (existing) {
      // Add stock to existing item instead of creating a duplicate document
      const addStock = Number(stock || 0);
      existing.stock = (Number(existing.stock || 0)) + addStock;
      if (price !== undefined && Number(price) > 0) {
        existing.price = Number(price);
      }
      if (category) {
        existing.category = category;
      }
      if (unit) {
        existing.unit = unit;
      }
      await existing.save();

      return NextResponse.json({ 
        success: true, 
        isMerged: true, 
        message: `Added +${addStock} ${existing.unit} stock to existing item "${existing.name}"!`,
        data: existing 
      }, { status: 200 });
    }

    const newItem = await Item.create({
      name: name.trim(),
      category,
      price: Number(price),
      stock: Number(stock || 0),
      unit: unit || 'kg',
      brand: brand ? brand.trim() : '',
      variety: variety ? variety.trim() : '',
    });

    return NextResponse.json({ success: true, isMerged: false, data: newItem }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

