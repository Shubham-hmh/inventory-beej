import mongoose, { Schema, Document, Model } from 'mongoose';
import './Customer';
import './Item';
import './User';

export interface ISaleItem {
  itemId: mongoose.Types.ObjectId;
  quantity: number;
  price: number; // Sale price (can be overridden from item default)
}

export interface ISale extends Document {
  customerId: mongoose.Types.ObjectId;
  items: ISaleItem[];
  totalAmount: number;
  paymentMode: 'Cash' | 'UPI' | 'Credit';
  date: Date;
  notes: string;
  invoiceSequence: number;
  invoiceNumber: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema: Schema = new Schema({
  itemId: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  price: { type: Number, required: true, min: 0 },
});

const SaleSchema: Schema<ISale> = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    items: [SaleItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: ['Cash', 'UPI', 'Credit'], default: 'Cash', required: true },
    date: { type: Date, required: true, default: Date.now },
    notes: { type: String, trim: true },
    invoiceSequence: { type: Number, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>('Sale', SaleSchema);

export default Sale;
