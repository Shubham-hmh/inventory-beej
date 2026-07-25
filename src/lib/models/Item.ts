import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItem extends Document {
  name: string;
  category: string;
  price: number; // Default selling price
  stock: number; // Current stock quantity
  unit: string;  // e.g., 'kg', 'bag', 'packet', 'litre'
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema: Schema<IItem> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, default: 'kg', trim: true },
  },
  { timestamps: true }
);

// Prevent compiling model multiple times due to Next.js hot reloading
const Item: Model<IItem> = mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema);

export default Item;
